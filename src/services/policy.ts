/**
 * Redaction policy defaults and Remote Config parsing (pure functions).
 * The Firebase wiring lives in src/config/firebase.ts.
 */
import type { EntityCategory, PolicyMode, RedactionPolicy } from './types';
import { ALL_CATEGORIES } from './types';

export const DEFAULT_CLOUD_MODEL = (import.meta.env?.VITE_CLOUD_MODEL as string | undefined) || 'gemini-3.5-flash';
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

/** Remote Config in-app defaults — used until (or if never) a fetch succeeds. */
export const REMOTE_CONFIG_DEFAULTS = {
  policy_mode: 'strict',
  policy_version: '1.4',
  custom_blocked_terms: '["Project Nightingale","Bluefin","ACME-INTERNAL"]',
  enable_audit_log: true,
  cloud_model: DEFAULT_CLOUD_MODEL,
  cloud_model_fallback: DEFAULT_FALLBACK_MODEL,
} as const;

export function allCategories(enabled = true): Record<EntityCategory, boolean> {
  return Object.fromEntries(ALL_CATEGORIES.map((c) => [c, enabled])) as Record<EntityCategory, boolean>;
}

export function parseBlockedTerms(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 1).slice(0, 500);
    }
  } catch {
    // Accept a comma-separated list as a forgiving fallback for console edits.
    return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 1);
  }
  return [];
}

export function parseMode(raw: string): PolicyMode {
  return raw.trim().toLowerCase() === 'standard' ? 'standard' : 'strict';
}

export interface RawRemoteValues {
  policy_mode: string;
  policy_version: string;
  custom_blocked_terms: string;
  enable_audit_log: boolean;
  cloud_model: string;
  cloud_model_fallback: string;
}

export function buildPolicy(raw: RawRemoteValues, source: RedactionPolicy['source']): RedactionPolicy {
  return {
    mode: parseMode(raw.policy_mode),
    version: raw.policy_version || '1.0',
    customBlockedTerms: parseBlockedTerms(raw.custom_blocked_terms),
    enableAuditLog: raw.enable_audit_log,
    cloudModel: raw.cloud_model || DEFAULT_CLOUD_MODEL,
    cloudFallbackModel: raw.cloud_model_fallback || DEFAULT_FALLBACK_MODEL,
    categories: allCategories(true),
    source,
    fetchedAt: source === 'remote' ? Date.now() : null,
  };
}

export const DEFAULT_POLICY: RedactionPolicy = buildPolicy(
  { ...REMOTE_CONFIG_DEFAULTS, enable_audit_log: REMOTE_CONFIG_DEFAULTS.enable_audit_log },
  'defaults',
);

export function policyLabel(p: RedactionPolicy): string {
  return `${p.mode === 'strict' ? 'Strict Enterprise' : 'Standard'} v${p.version}`;
}
