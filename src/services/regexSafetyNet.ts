/**
 * Stage 1 safety net: a fast, deterministic regex + entropy scanner.
 *
 * It always runs — alongside Gemini Nano when available, and as the primary
 * detector in fallback mode. Its job is to guarantee that high-signal secrets
 * (AWS keys, `sk-...` keys, JWTs, PEM blocks, DSNs) are caught even if the
 * on-device LLM misses them. A language model is probabilistic; this is not.
 */
import type { Detection, EntityType, RedactionPolicy } from './types';
import { ENTITY_META } from './types';

interface Pattern {
  type: EntityType;
  regex: RegExp;
  /** Capture group holding the sensitive value (defaults to the full match). */
  group?: number;
  strictOnly?: boolean;
  validate?: (value: string) => boolean;
}

/** Luhn checksum — avoids flagging random 16-digit numbers as cards. */
export function luhnValid(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Shannon entropy in bits per character. */
export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function validIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  if (!parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return false;
  // Version-like strings such as 1.2.3.4 are rare; but 0.0.0.0 / 255.255.255.0 masks are not secrets.
  return ip !== '0.0.0.0' && !ip.startsWith('255.');
}

const PATTERNS: Pattern[] = [
  // ---- Secrets (highest priority) ----
  { type: 'PRIVATE_KEY', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/g },
  { type: 'CONNECTION_STRING', regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|amqp|mssql):\/\/[^\s'"`<>]+/gi },
  { type: 'AWS_ACCESS_KEY', regex: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA)[0-9A-Z]{16}\b/g },
  {
    type: 'AWS_SECRET',
    regex: /\b(?:aws_?secret(?:_?access)?_?key|secretAccessKey|AWS_SECRET_ACCESS_KEY)\b["']?\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})(?![A-Za-z0-9/+=])/gi,
    group: 1,
  },
  { type: 'API_KEY', regex: /\bsk-(?:proj-|ant-|live-|test-)?[A-Za-z0-9_-]{20,}/g },
  { type: 'API_KEY', regex: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { type: 'API_KEY', regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { type: 'API_KEY', regex: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g },
  { type: 'API_KEY', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { type: 'API_KEY', regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { type: 'API_KEY', regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g },
  { type: 'JWT', regex: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  {
    type: 'API_KEY',
    regex: /\b(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|client[_-]?secret|bearer)\b["']?\s*[:=]\s*["']([A-Za-z0-9_\-./+=]{12,})["']/gi,
    group: 1,
  },
  { type: 'API_KEY', regex: /\bBearer\s+([A-Za-z0-9_\-.=]{20,})/g, group: 1 },
  {
    type: 'PASSWORD',
    regex: /\b(?:password|passwd|pwd|pass|db_pass(?:word)?|secret)\b["']?\s*[:=]\s*["']([^"'\s]{4,})["']/gi,
    group: 1,
  },
  {
    type: 'PASSWORD',
    regex: /\b(?:PASSWORD|PASSWD|DB_PASS(?:WORD)?|SECRET)\s*=\s*([^\s"'#]{4,})/g,
    group: 1,
  },

  // ---- PII ----
  { type: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: 'SSN', regex: /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g },
  {
    type: 'PHONE',
    regex: /(?<![\w.-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\w-])|\+\d{1,3}[\s.-]\d{2,4}[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
  },
  {
    type: 'DOB',
    regex: /\b(?:DOB|D\.O\.B\.|Date of Birth|Birth ?date|born)\s*[:\-]?\s*((?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})|(?:\d{4}-\d{2}-\d{2})|(?:[A-Z][a-z]{2,8}\.? \d{1,2},? \d{4}))/gi,
    group: 1,
  },
  {
    type: 'DOB',
    strictOnly: true,
    regex: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b|\b(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}\b/g,
  },
  {
    type: 'ADDRESS',
    regex: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Parkway|Pkwy)\b\.?(?:,?\s+(?:Apt|Suite|Unit|#)\s*[\w-]+)?/g,
  },
  { type: 'IP_ADDRESS', regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, validate: validIPv4 },
  { type: 'IP_ADDRESS', regex: /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi },

  // ---- Financial ----
  { type: 'CREDIT_CARD', regex: /\b(?:\d[ -]?){12,18}\d\b/g, validate: luhnValid },
  { type: 'IBAN', regex: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g },
  {
    type: 'MONEY',
    regex: /(?:[$€£¥]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion|trillion|thousand|[MBK]n?|mm)\b)?|\b\d[\d,]*(?:\.\d+)?\s?(?:million|billion)\s(?:USD|EUR|GBP|dollars)\b|\b(?:USD|EUR|GBP)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion|[MB]))?\b)/gi,
  },

  // ---- Medical ----
  {
    type: 'MEDICAL_ID',
    regex: /\b(?:MRN|Medical Record(?: Number| No\.?)?|Patient ID|Member ID|Policy (?:No\.?|Number)|Insurance ID|NPI|Encounter(?: ID| No\.?)?)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,})\b/gi,
    group: 1,
  },

  // ---- Corporate ----
  {
    type: 'HOSTNAME',
    regex: /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.(?:internal|corp|local|lan|intra|intranet|prod|svc\.cluster\.local)\b/gi,
  },
];

/** High-entropy blobs that look like credentials (strict mode only). */
const ENTROPY_CANDIDATE = /[A-Za-z0-9+/_=-]{32,}/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect sensitive entities with deterministic patterns.
 * Category toggles and strict/standard mode are respected here so the policy
 * drawer has an immediate, visible effect on what gets redacted.
 */
export function regexDetect(text: string, policy: RedactionPolicy): Detection[] {
  const out: Detection[] = [];
  const strict = policy.mode === 'strict';

  for (const p of PATTERNS) {
    if (p.strictOnly && !strict) continue;
    if (!policy.categories[ENTITY_META[p.type].category]) continue;
    p.regex.lastIndex = 0;
    for (const m of text.matchAll(p.regex)) {
      const full = m[0];
      const value = p.group !== undefined ? m[p.group] : full;
      if (!value) continue;
      const offsetInMatch = p.group !== undefined ? full.indexOf(value) : 0;
      const start = (m.index ?? 0) + Math.max(0, offsetInMatch);
      const trimmed = value.replace(/[.,;:)\]]+$/, '');
      if (p.validate && !p.validate(trimmed)) continue;
      if (trimmed.length < 2) continue;
      out.push({ start, end: start + trimmed.length, value: trimmed, type: p.type, source: 'regex' });
    }
  }

  if (strict && policy.categories.SECRETS) {
    for (const m of text.matchAll(ENTROPY_CANDIDATE)) {
      const v = m[0];
      const hasDigit = /\d/.test(v);
      const hasUpper = /[A-Z]/.test(v);
      const hasLower = /[a-z]/.test(v);
      if (hasDigit && hasUpper && hasLower && shannonEntropy(v) >= 4.2) {
        const start = m.index ?? 0;
        out.push({ start, end: start + v.length, value: v, type: 'API_KEY', source: 'regex' });
      }
    }
  }

  // Remote Config "custom_blocked_terms" are enforced regardless of category
  // toggles: they are an admin mandate, not a user preference.
  for (const term of policy.customBlockedTerms) {
    const t = term.trim();
    if (t.length < 2) continue;
    const re = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(t)}(?![A-Za-z0-9])`, 'gi');
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      out.push({ start, end: start + m[0].length, value: m[0], type: 'BLOCKED_TERM', source: 'policy' });
    }
  }

  return out;
}
