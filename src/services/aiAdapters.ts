/**
 * Firebase AI Logic adapters that plug into the framework-free pipeline.
 *
 *  - Stage 1: `FirebaseNanoExtractor` → getGenerativeModel({ mode: ONLY_ON_DEVICE })
 *             with a JSON responseConstraint (structured output from Gemini Nano).
 *  - Stage 2: `FirebaseCloudReasoner` → getGenerativeModel({ mode: ONLY_IN_CLOUD }).
 */
import { getGenerativeModel, InferenceMode, Schema, type AI, type Content, type GenerativeModel } from 'firebase/ai';
import type { CloudReasoner, CloudResult, ExtractedEntity, OnDeviceExtractor } from './hybridPipeline';
import type { ChatTurn, EntityType } from './types';
import { simulateCloudAnswer } from './cloudSimulator';
import { emitSimulated } from './wireTap';

// ───────────────────────────── Nano availability ─────────────────────────────

export type NanoStatus = 'checking' | 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported';

const NANO_IO = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

export async function checkNanoAvailability(): Promise<NanoStatus> {
  if (typeof LanguageModel === 'undefined' || !LanguageModel) return 'unsupported';
  try {
    return await LanguageModel.availability(NANO_IO);
  } catch {
    return 'unavailable';
  }
}

// ───────────────────────────── Stage 1 extractor ─────────────────────────────

const NANO_TYPES: EntityType[] = [
  'PERSON', 'EMAIL', 'PHONE', 'SSN', 'DOB', 'ADDRESS', 'IP_ADDRESS', 'API_KEY', 'PASSWORD',
  'CONNECTION_STRING', 'CREDIT_CARD', 'MONEY', 'MEDICAL_ID', 'ORG', 'CODENAME', 'HOSTNAME',
];

const extractionSchema = Schema.object({
  properties: {
    entities: Schema.array({
      items: Schema.object({
        properties: {
          text: Schema.string({ description: 'The exact substring copied verbatim from the input.' }),
          type: Schema.enumString({ enum: NANO_TYPES }),
        },
      }),
    }),
  },
});

const NANO_SYSTEM_PROMPT = `You are a privacy firewall running fully on-device. Extract every sensitive entity from the user's text.
Return JSON {"entities":[{"text": "...", "type": "..."}]}.
- "text" MUST be copied character-for-character from the input. Never paraphrase.
- Types: PERSON (human names), EMAIL, PHONE, SSN, DOB, ADDRESS, IP_ADDRESS, API_KEY (any key/token/secret),
  PASSWORD, CONNECTION_STRING, CREDIT_CARD, MONEY (deal values, prices, salaries), MEDICAL_ID (MRN, insurance/member IDs),
  ORG (company / institution names), CODENAME (internal project or product codenames), HOSTNAME (internal hosts).
- Do NOT extract medical diagnoses, medications, generic job titles, programming keywords, or public library names.
- If nothing is sensitive, return {"entities":[]}.`;

const CHUNK = 3500;

function chunkText(text: string): string[] {
  if (text.length <= CHUNK) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(text.length, i + CHUNK);
    const nl = text.lastIndexOf('\n', end);
    if (end < text.length && nl > i + CHUNK / 2) end = nl;
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

function parseEntities(raw: string, allowed: Set<EntityType>): ExtractedEntity[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  const parsed = JSON.parse(cleaned) as { entities?: { text?: unknown; type?: unknown }[] };
  return (parsed.entities ?? [])
    .filter((e): e is { text: string; type: EntityType } =>
      typeof e.text === 'string' && typeof e.type === 'string' && allowed.has(e.type as EntityType),
    )
    .map((e) => ({ text: e.text, type: e.type }));
}

/** Gemini Nano through Firebase AI Logic (`InferenceMode.ONLY_ON_DEVICE`). */
export class FirebaseNanoExtractor implements OnDeviceExtractor {
  private model: GenerativeModel;

  constructor(ai: AI) {
    this.model = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {
        createOptions: {
          ...NANO_IO,
          initialPrompts: [{ role: 'system', content: [{ type: 'text', value: NANO_SYSTEM_PROMPT }] }],
        },
        promptOptions: { responseConstraint: extractionSchema },
      },
    });
  }

  /** Must be called from a user gesture if a download is required. */
  initialize(onProgress?: (p: number) => void): Promise<void> {
    return this.model.initializeDeviceModel(onProgress);
  }

  async extract(text: string, allowedTypes: EntityType[]): Promise<ExtractedEntity[]> {
    const allowed = new Set(allowedTypes);
    const out: ExtractedEntity[] = [];
    for (const chunk of chunkText(text)) {
      const res = await this.model.generateContent(chunk);
      out.push(...parseEntities(res.response.text(), allowed));
    }
    return out;
  }
}

/**
 * Same on-device model, called through Chrome's Prompt API directly. Used only
 * when no Firebase project is configured (Firebase requires an app config even
 * for on-device inference), so the Nano path still works in offline demos.
 */
export class DirectNanoExtractor implements OnDeviceExtractor {
  private session: Promise<NanoSession> | null = null;

  private getSession(): Promise<NanoSession> {
    if (!LanguageModel) return Promise.reject(new Error('Prompt API unavailable'));
    this.session ??= LanguageModel.create({
      ...NANO_IO,
      initialPrompts: [{ role: 'system', content: NANO_SYSTEM_PROMPT }],
    });
    return this.session;
  }

  async extract(text: string, allowedTypes: EntityType[]): Promise<ExtractedEntity[]> {
    const session = await this.getSession();
    const allowed = new Set(allowedTypes);
    const schema = {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: { text: { type: 'string' }, type: { type: 'string', enum: NANO_TYPES } },
            required: ['text', 'type'],
          },
        },
      },
      required: ['entities'],
    };
    const out: ExtractedEntity[] = [];
    for (const chunk of chunkText(text)) {
      out.push(...parseEntities(await session.prompt(chunk, { responseConstraint: schema }), allowed));
    }
    return out;
  }
}

// ───────────────────────────── Stage 2 reasoners ─────────────────────────────

function toContents(history: ChatTurn[]): Content[] {
  return history.map((t) => ({ role: t.role, parts: [{ type: 'text' as const, text: t.sanitized }] }));
}

/** REST wire shape (as serialized by generateContent). */
function toWireContents(history: ChatTurn[]) {
  return history.map((t) => ({ role: t.role, parts: [{ text: t.sanitized }] }));
}

/** Per-attempt cloud timeout. Generous for long answers, short enough to fall back. */
export const CLOUD_ATTEMPT_TIMEOUT_MS = 90_000;

/** Errors worth retrying on another model: overload, server faults, timeouts. */
export function isTransientCloudError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /\b(500|502|503|504|429)\b|high demand|overloaded|unavailable|resource.?exhausted|timeout|timed out|abort|deadline/i.test(msg);
}

/**
 * Cloud Gemini through Firebase AI Logic (`InferenceMode.ONLY_IN_CLOUD`).
 * Tries the primary model, then the fallback model if the first attempt times
 * out or the model is overloaded. Each attempt is captured by the wire tap.
 */
export class FirebaseCloudReasoner implements CloudReasoner {
  readonly simulated = false;
  private cache = new Map<string, GenerativeModel>();
  private readonly chain: string[];

  constructor(
    private ai: AI,
    readonly model: string,
    fallbackModel?: string,
  ) {
    this.chain = [model, ...(fallbackModel && fallbackModel !== model ? [fallbackModel] : [])];
  }

  private getModel(name: string, systemInstruction: string): GenerativeModel {
    const key = `${name}\u0000${systemInstruction}`;
    let m = this.cache.get(key);
    if (!m) {
      m = getGenerativeModel(
        this.ai,
        {
          mode: InferenceMode.ONLY_IN_CLOUD,
          inCloudParams: {
            model: name,
            systemInstruction,
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
          },
        },
        { timeout: CLOUD_ATTEMPT_TIMEOUT_MS },
      );
      this.cache.set(key, m);
    }
    return m;
  }

  async generate(history: ChatTurn[], systemInstruction: string): Promise<CloudResult> {
    let lastErr: unknown;
    for (const [i, name] of this.chain.entries()) {
      try {
        const res = await this.getModel(name, systemInstruction).generateContent({ contents: toContents(history) });
        return { text: res.response.text(), inferenceSource: res.response.inferenceSource ?? 'IN_CLOUD', model: name };
      } catch (err) {
        lastErr = err;
        const more = i < this.chain.length - 1;
        if (!more || !isTransientCloudError(err)) break;
        console.warn(`[NullTrace] ${name} failed (${err instanceof Error ? err.message : err}); falling back to ${this.chain[i + 1]}.`);
      }
    }
    throw lastErr;
  }
}

/**
 * Offline demo reasoner. Publishes the exact request body that *would* be
 * sent to the wire inspector (flagged SIMULATED) and returns a token-preserving
 * answer generated locally. Never used when Firebase is configured.
 */
export class SimulatedCloudReasoner implements CloudReasoner {
  readonly simulated = true;
  constructor(readonly model: string) {}

  async generate(history: ChatTurn[], systemInstruction: string): Promise<CloudResult> {
    const body = JSON.stringify({
      contents: toWireContents(history),
      systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    });
    emitSimulated(
      `https://firebasevertexai.googleapis.com/v1beta/projects/demo-project/models/${this.model}:generateContent`,
      body,
    );
    await new Promise((r) => setTimeout(r, 650 + Math.random() * 500));
    return { text: simulateCloudAnswer(history[history.length - 1]?.sanitized ?? ''), inferenceSource: 'SIMULATED', model: this.model };
  }
}
