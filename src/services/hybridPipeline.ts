/**
 * NullTrace 3-stage hybrid pipeline.
 *
 *   ┌────────────── device ──────────────┐        ┌──── cloud ────┐
 *   input ─► Stage 1: Nano + regex + NER ─► sanitized ─► Stage 2: Gemini
 *                     │  (vault: token↔value)            │
 *   output ◄─ Stage 3: re-hydrate ◄─────────────── tokenized answer
 *
 * This module is framework-free: Firebase AI Logic is injected via the
 * `OnDeviceExtractor` and `CloudReasoner` interfaces (see aiAdapters.ts), so
 * every stage is unit-testable with fakes.
 */
import { LocalVault } from './localVault';
import { nerDetect } from './localNer';
import { regexDetect } from './regexSafetyNet';
import type {
  ChatTurn,
  Detection,
  EntityType,
  HydratedSegment,
  RedactedSpan,
  RedactionPolicy,
  RedactionResult,
} from './types';
import { ENTITY_META } from './types';

// ───────────────────────────── Injected adapters ─────────────────────────────

export interface ExtractedEntity {
  text: string;
  type: EntityType;
}

/** Stage 1 on-device model (Gemini Nano via Firebase AI Logic ONLY_ON_DEVICE). */
export interface OnDeviceExtractor {
  extract(text: string, allowedTypes: EntityType[]): Promise<ExtractedEntity[]>;
}

export interface CloudResult {
  text: string;
  inferenceSource: string;
  /** The model that actually answered (may be the fallback). */
  model?: string;
}

/** Stage 2 cloud model (Gemini via Firebase AI Logic ONLY_IN_CLOUD). */
export interface CloudReasoner {
  readonly model: string;
  readonly simulated: boolean;
  generate(history: ChatTurn[], systemInstruction: string): Promise<CloudResult>;
}

/** Counts outbound network requests so Stage 1 can prove it made none. */
export interface NetworkMonitor {
  requestCount(): number;
}

// ───────────────────────────── Detection merging ─────────────────────────────

const SOURCE_RANK: Record<Detection['source'], number> = {
  policy: 5,
  regex: 4,
  nano: 3,
  ner: 2,
  propagation: 1,
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find every occurrence of already-detected values (case-sensitive, word-bounded). */
function propagate(text: string, detections: Detection[]): Detection[] {
  const extra: Detection[] = [];
  const seen = new Set<string>();
  const addAll = (value: string, type: EntityType) => {
    const key = `${type}::${value}`;
    if (seen.has(key) || value.length < 3) return;
    seen.add(key);
    const re = new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(value)}(?![A-Za-z0-9_])`, 'g');
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      extra.push({ start, end: start + value.length, value, type, source: 'propagation' });
    }
  };
  for (const d of detections) {
    addAll(d.value, d.type);
    // "Dr. Eleanor Vance" → also shield a later bare "Vance" or "Eleanor".
    if (d.type === 'PERSON') {
      const parts = d.value.split(/\s+/).filter((p) => p.length >= 3 && !/^[A-Z]\.$/.test(p));
      if (parts.length >= 2) {
        addAll(parts[parts.length - 1], 'PERSON');
        addAll(parts[0], 'PERSON');
      }
    }
  }
  return extra;
}

/**
 * Merge detections from all engines into a non-overlapping set.
 * Longest span wins; ties go to the more deterministic source.
 */
export function mergeDetections(text: string, detections: Detection[]): Detection[] {
  const all = [...detections, ...propagate(text, detections)];
  all.sort(
    (a, b) => b.end - b.start - (a.end - a.start) || SOURCE_RANK[b.source] - SOURCE_RANK[a.source] || a.start - b.start,
  );
  const accepted: Detection[] = [];
  for (const d of all) {
    if (d.end <= d.start) continue;
    if (accepted.some((a) => d.start < a.end && a.start < d.end)) continue;
    accepted.push(d);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

/** Replace detections with vault tokens. Detections must be non-overlapping. */
export function applyRedaction(
  text: string,
  detections: Detection[],
  vault: LocalVault,
): { sanitized: string; spans: RedactedSpan[] } {
  let out = '';
  let cursor = 0;
  const spans: RedactedSpan[] = [];
  for (const d of detections) {
    const value = text.slice(d.start, d.end);
    const token = vault.tokenize(value, d.type);
    out += text.slice(cursor, d.start) + token;
    spans.push({ ...d, value, token });
    cursor = d.end;
  }
  out += text.slice(cursor);
  return { sanitized: out, spans };
}

/** Locate Nano's verbatim entity strings in the source text. Drops hallucinations. */
export function locateEntities(text: string, entities: ExtractedEntity[]): Detection[] {
  const out: Detection[] = [];
  for (const e of entities) {
    const value = e.text?.trim();
    if (!value || value.length < 2 || !(e.type in ENTITY_META)) continue;
    let from = 0;
    let idx: number;
    let found = false;
    while ((idx = text.indexOf(value, from)) !== -1) {
      out.push({ start: idx, end: idx + value.length, value, type: e.type, source: 'nano' });
      from = idx + value.length;
      found = true;
    }
    if (!found) continue; // Model invented a string not present in the input — ignore.
  }
  return out;
}

export function allowedTypes(policy: RedactionPolicy): EntityType[] {
  return (Object.keys(ENTITY_META) as EntityType[]).filter(
    (t) => t !== 'BLOCKED_TERM' && policy.categories[ENTITY_META[t].category],
  );
}

// ───────────────────────────── Stage 1: redact ─────────────────────────────

export interface RedactOptions {
  extractor?: OnDeviceExtractor | null;
  network?: NetworkMonitor;
  now?: () => number;
}

/** Deterministic-only redaction (regex + NER). Used for live previews and fallback. */
export function redactDeterministic(text: string, policy: RedactionPolicy, vault: LocalVault) {
  const dets = mergeDetections(text, [...regexDetect(text, policy), ...nerDetect(text, policy)]);
  return applyRedaction(text, dets, vault);
}

export async function redactLocally(
  text: string,
  policy: RedactionPolicy,
  vault: LocalVault,
  opts: RedactOptions = {},
): Promise<RedactionResult> {
  const now = opts.now ?? (() => performance.now());
  const t0 = now();
  const netBefore = opts.network?.requestCount() ?? 0;

  const detections: Detection[] = [...regexDetect(text, policy)];
  let engine: RedactionResult['engine'] = 'fallback';
  let nanoError: string | undefined;

  if (opts.extractor) {
    try {
      const entities = await opts.extractor.extract(text, allowedTypes(policy));
      detections.push(...locateEntities(text, entities));
      engine = 'nano';
    } catch (err) {
      nanoError = err instanceof Error ? err.message : String(err);
    }
  }
  // Rule-based NER always contributes: in Nano mode it is extra recall, in
  // fallback mode it is the primary entity recognizer.
  detections.push(...nerDetect(text, policy));

  const merged = mergeDetections(text, detections);
  const { sanitized, spans } = applyRedaction(text, merged, vault);

  return {
    original: text,
    sanitized,
    spans,
    engine,
    latencyMs: Math.round((now() - t0) * 10) / 10,
    networkCallsDuringStage: (opts.network?.requestCount() ?? 0) - netBefore,
    nanoError,
  };
}

// ───────────────────────────── Egress guard ─────────────────────────────

export interface EgressScan {
  leakedValues: string[];
  leakedBytes: number;
  payloadBytes: number;
}

const encoder = new TextEncoder();

/** Scan an outbound payload for any vault value. Must report 0 leaked bytes. */
export function scanEgress(payload: string, protectedValues: string[]): EgressScan {
  const leaked = new Set<string>();
  const hay = payload.toLowerCase();
  for (const v of protectedValues) {
    const needle = v.trim().toLowerCase();
    if (needle.length < 3) continue;
    if (needle.length < 8) {
      // Short values (e.g. a first name) must match as whole words so "Ann" doesn't flag "annual".
      const re = new RegExp(`(?<![a-z0-9_])${escapeRegExp(needle)}(?![a-z0-9_])`);
      if (re.test(hay)) leaked.add(v);
    } else if (hay.includes(needle)) leaked.add(v);
    else {
      // Also check the JSON-escaped form (quotes/backslashes/newlines get escaped on the wire).
      const escaped = JSON.stringify(needle).slice(1, -1);
      if (escaped !== needle && hay.includes(escaped)) leaked.add(v);
    }
  }
  let leakedBytes = 0;
  for (const v of leaked) leakedBytes += encoder.encode(v).length;
  return { leakedValues: [...leaked], leakedBytes, payloadBytes: encoder.encode(payload).length };
}

export class EgressViolationError extends Error {
  constructor(public readonly scan: EgressScan) {
    super(`Egress guard blocked request: ${scan.leakedValues.length} protected value(s) found in outbound payload.`);
    this.name = 'EgressViolationError';
  }
}

// ───────────────────────────── Stage 2: cloud ─────────────────────────────

export const CLOUD_SYSTEM_INSTRUCTION = [
  'You are the cloud reasoning engine inside NullTrace, a zero-trust privacy workspace.',
  'The user content has been sanitized on-device: every sensitive value was replaced with a placeholder token such as [PERSON_1], [SECRET_KEY_2], [ORG_1], [AMOUNT_1], [IP_3].',
  'RULES:',
  '1. Preserve every placeholder token EXACTLY as written, including the square brackets, whenever you refer to that entity. Never alter, merge, renumber, or translate tokens.',
  '2. Never guess, reconstruct, or invent the real values behind tokens, and never create new tokens.',
  '3. Treat each token as an opaque but consistent identity (the same token always means the same entity).',
  '4. If code contains tokens in place of secrets, keep the tokens in the code you return; recommend loading secrets from environment variables or a secret manager.',
  '5. Be precise, expert-level, and well-structured. Use Markdown headings, bullet lists, and fenced code blocks where helpful.',
].join('\n');

export async function reasonInCloud(
  history: ChatTurn[],
  reasoner: CloudReasoner,
  vault: LocalVault,
  now: () => number = () => performance.now(),
): Promise<CloudResult & { latencyMs: number; preflight: EgressScan }> {
  // Fail closed: if anything protected would leave the device, do not send.
  const preflight = scanEgress(
    JSON.stringify({ history, systemInstruction: CLOUD_SYSTEM_INSTRUCTION }),
    vault.protectedValues(),
  );
  if (preflight.leakedValues.length > 0) throw new EgressViolationError(preflight);

  const t0 = now();
  const result = await reasoner.generate(history, CLOUD_SYSTEM_INSTRUCTION);
  return { ...result, latencyMs: Math.round(now() - t0), preflight };
}

// ───────────────────────────── Stage 3: re-hydrate ─────────────────────────────

export function rehydrate(text: string, vault: LocalVault): HydratedSegment[] {
  return vault.rehydrate(text);
}

// ───────────────────────────── Orchestrator ─────────────────────────────

export type PipelineStage = 'idle' | 'redacting' | 'guarding' | 'cloud' | 'rehydrating' | 'done' | 'error';

export interface PipelineRun {
  redaction: RedactionResult;
  cloud: CloudResult & { latencyMs: number; preflight: EgressScan };
  hydrated: HydratedSegment[];
}

export interface PipelineDeps extends RedactOptions {
  reasoner: CloudReasoner;
  onStage?: (stage: PipelineStage, info?: Partial<PipelineRun>) => void;
}

/**
 * Run all three stages for one user turn.
 * `priorHistory` must already be sanitized (it is — we only ever store sanitized turns).
 */
export async function runHybridPipeline(
  input: string,
  priorHistory: ChatTurn[],
  policy: RedactionPolicy,
  vault: LocalVault,
  deps: PipelineDeps,
): Promise<PipelineRun> {
  deps.onStage?.('redacting');
  const redaction = await redactLocally(input, policy, vault, deps);
  deps.onStage?.('guarding', { redaction });

  const history: ChatTurn[] = [...priorHistory, { role: 'user', sanitized: redaction.sanitized }];
  deps.onStage?.('cloud', { redaction });
  const cloud = await reasonInCloud(history, deps.reasoner, vault, deps.now);

  deps.onStage?.('rehydrating', { redaction, cloud });
  const hydrated = rehydrate(cloud.text, vault);
  const run = { redaction, cloud, hydrated };
  deps.onStage?.('done', run);
  return run;
}
