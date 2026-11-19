/**
 * The Local Vault: an in-memory, browser-only map of placeholder tokens to the
 * real values they replaced.
 *
 * Security properties:
 *  - Lives only in JS heap memory. Never written to localStorage, IndexedDB,
 *    cookies, URLs, logs, or any network request.
 *  - Deterministic: the same value always maps to the same token within a
 *    session, so the cloud model can reason about identity ("[PERSON_1] signed
 *    with [ORG_2]") without ever learning who they are.
 *  - `wipe()` drops every reference so values become unreachable and are
 *    garbage-collected (the "panic button").
 */
import type { EntityType, HydratedSegment } from './types';
import { ENTITY_META } from './types';

export interface VaultEntry {
  token: string;
  value: string;
  type: EntityType;
  createdAt: number;
  hits: number;
}

/** Matches [PREFIX_N] and the bracket-less PREFIX_N some models emit. */
const TOKEN_PATTERN = /\[([A-Z][A-Z_]*_\d+)\]|\b([A-Z][A-Z_]*_\d+)\b/g;

export class LocalVault {
  private byToken = new Map<string, VaultEntry>();
  private byValue = new Map<string, string>();
  private counters = new Map<string, number>();
  private listeners = new Set<() => void>();
  private version = 0;

  /** Stable key so "James Hartwell" and "james hartwell " share a token. */
  private static normalize(value: string, type: EntityType): string {
    return `${ENTITY_META[type].prefix}::${value.trim().replace(/\s+/g, ' ').toLowerCase()}`;
  }

  tokenize(value: string, type: EntityType): string {
    const key = LocalVault.normalize(value, type);
    const existing = this.byValue.get(key);
    if (existing) {
      const entry = this.byToken.get(existing);
      if (entry) entry.hits += 1;
      return existing;
    }
    const prefix = ENTITY_META[type].prefix;
    const n = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, n);
    const token = `[${prefix}_${n}]`;
    this.byToken.set(token, { token, value, type, createdAt: Date.now(), hits: 1 });
    this.byValue.set(key, token);
    this.emit();
    return token;
  }

  resolve(token: string): VaultEntry | undefined {
    const normalized = token.startsWith('[') ? token : `[${token}]`;
    return this.byToken.get(normalized);
  }

  has(token: string): boolean {
    return this.resolve(token) !== undefined;
  }

  entries(): VaultEntry[] {
    return [...this.byToken.values()];
  }

  /** Every real value currently protected — used by the egress scanner. */
  protectedValues(): string[] {
    return this.entries().map((e) => e.value);
  }

  get size(): number {
    return this.byToken.size;
  }

  get revision(): number {
    return this.version;
  }

  /** Detached copy for side-effect-free previews (draft redaction as you type). */
  fork(): LocalVault {
    const v = new LocalVault();
    for (const [k, e] of this.byToken) v.byToken.set(k, { ...e });
    for (const [k, t] of this.byValue) v.byValue.set(k, t);
    for (const [k, n] of this.counters) v.counters.set(k, n);
    return v;
  }

  wipe(): void {
    for (const entry of this.byToken.values()) {
      // Best effort: drop references (JS strings are immutable; GC reclaims them).
      (entry as { value: string }).value = '';
    }
    this.byToken.clear();
    this.byValue.clear();
    this.counters.clear();
    this.emit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.version += 1;
    for (const fn of this.listeners) fn();
  }

  /**
   * Stage 3: swap placeholders in cloud output back to real values, returning
   * structured segments so the UI can render each restored entity as a badge.
   */
  rehydrate(text: string): HydratedSegment[] {
    const segments: HydratedSegment[] = [];
    let cursor = 0;
    TOKEN_PATTERN.lastIndex = 0;
    for (const m of text.matchAll(TOKEN_PATTERN)) {
      const raw = m[1] ?? m[2];
      const bracketed = m[1] !== undefined;
      const entry = this.resolve(raw);
      // Bare (unbracketed) identifiers are only treated as tokens if we own them,
      // so normal code like MAX_RETRIES_3 is left alone.
      if (!entry && !bracketed) continue;
      const idx = m.index ?? 0;
      if (idx > cursor) segments.push({ kind: 'text', text: text.slice(cursor, idx) });
      if (entry) {
        segments.push({ kind: 'entity', token: entry.token, value: entry.value, type: entry.type });
      } else {
        segments.push({ kind: 'unknown-token', token: `[${raw}]` });
      }
      cursor = idx + m[0].length;
    }
    if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) });
    return segments;
  }

  /** Plain-string re-hydration (for copy-to-clipboard). */
  rehydrateToString(text: string): string {
    return this.rehydrate(text)
      .map((s) => (s.kind === 'text' ? s.text : s.kind === 'entity' ? s.value : s.token))
      .join('');
  }
}
