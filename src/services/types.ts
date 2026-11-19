/**
 * Shared domain types for the NullTrace hybrid privacy pipeline.
 * Everything in this file is framework-free so the engine stays unit-testable.
 */

export type EntityCategory = 'PII' | 'SECRETS' | 'FINANCIAL' | 'MEDICAL' | 'CORPORATE';

export type EntityType =
  | 'PERSON'
  | 'EMAIL'
  | 'PHONE'
  | 'SSN'
  | 'DOB'
  | 'ADDRESS'
  | 'IP_ADDRESS'
  | 'API_KEY'
  | 'AWS_ACCESS_KEY'
  | 'AWS_SECRET'
  | 'JWT'
  | 'PRIVATE_KEY'
  | 'PASSWORD'
  | 'CONNECTION_STRING'
  | 'CREDIT_CARD'
  | 'IBAN'
  | 'MONEY'
  | 'MEDICAL_ID'
  | 'ORG'
  | 'CODENAME'
  | 'HOSTNAME'
  | 'BLOCKED_TERM';

/** Which local engine produced a detection. */
export type DetectionSource = 'nano' | 'regex' | 'ner' | 'policy' | 'propagation';

export interface Detection {
  start: number;
  /** Exclusive end offset. */
  end: number;
  value: string;
  type: EntityType;
  source: DetectionSource;
}

export interface RedactedSpan extends Detection {
  token: string;
}

export interface EntityMeta {
  category: EntityCategory;
  /** Token prefix, e.g. PERSON → [PERSON_1]. */
  prefix: string;
  label: string;
}

export const ENTITY_META: Record<EntityType, EntityMeta> = {
  PERSON: { category: 'PII', prefix: 'PERSON', label: 'Person name' },
  EMAIL: { category: 'PII', prefix: 'EMAIL', label: 'Email address' },
  PHONE: { category: 'PII', prefix: 'PHONE', label: 'Phone number' },
  SSN: { category: 'PII', prefix: 'SSN', label: 'Social Security Number' },
  DOB: { category: 'PII', prefix: 'DOB', label: 'Date of birth' },
  ADDRESS: { category: 'PII', prefix: 'ADDRESS', label: 'Street address' },
  IP_ADDRESS: { category: 'SECRETS', prefix: 'IP', label: 'IP address' },
  API_KEY: { category: 'SECRETS', prefix: 'SECRET_KEY', label: 'API key / token' },
  AWS_ACCESS_KEY: { category: 'SECRETS', prefix: 'SECRET_KEY', label: 'AWS access key ID' },
  AWS_SECRET: { category: 'SECRETS', prefix: 'SECRET_KEY', label: 'AWS secret access key' },
  JWT: { category: 'SECRETS', prefix: 'SECRET_KEY', label: 'JSON Web Token' },
  PRIVATE_KEY: { category: 'SECRETS', prefix: 'SECRET_KEY', label: 'Private key block' },
  PASSWORD: { category: 'SECRETS', prefix: 'PASSWORD', label: 'Password / credential' },
  CONNECTION_STRING: { category: 'SECRETS', prefix: 'CONN_STRING', label: 'Connection string' },
  CREDIT_CARD: { category: 'FINANCIAL', prefix: 'CARD', label: 'Payment card' },
  IBAN: { category: 'FINANCIAL', prefix: 'IBAN', label: 'Bank account (IBAN)' },
  MONEY: { category: 'FINANCIAL', prefix: 'AMOUNT', label: 'Monetary amount' },
  MEDICAL_ID: { category: 'MEDICAL', prefix: 'MEDICAL_ID', label: 'Medical record / insurance ID' },
  ORG: { category: 'CORPORATE', prefix: 'ORG', label: 'Organization' },
  CODENAME: { category: 'CORPORATE', prefix: 'CODENAME', label: 'Project codename' },
  HOSTNAME: { category: 'CORPORATE', prefix: 'HOST', label: 'Internal hostname' },
  BLOCKED_TERM: { category: 'CORPORATE', prefix: 'BLOCKED_TERM', label: 'Policy-blocked term' },
};

export const ALL_CATEGORIES: EntityCategory[] = ['PII', 'SECRETS', 'FINANCIAL', 'MEDICAL', 'CORPORATE'];

export const CATEGORY_LABELS: Record<EntityCategory, { title: string; blurb: string }> = {
  PII: { title: 'Personal Identifiers', blurb: 'Names, emails, phones, SSNs, DOB, addresses' },
  SECRETS: { title: 'Secrets & Credentials', blurb: 'API keys, AWS creds, JWTs, passwords, IPs, DSNs' },
  FINANCIAL: { title: 'Financial', blurb: 'Deal values, card numbers, IBANs' },
  MEDICAL: { title: 'Medical (PHI)', blurb: 'MRNs, insurance member IDs, patient IDs' },
  CORPORATE: { title: 'Corporate IP', blurb: 'Org names, codenames, internal hosts, blocked terms' },
};

export type PolicyMode = 'strict' | 'standard';

export interface RedactionPolicy {
  mode: PolicyMode;
  version: string;
  customBlockedTerms: string[];
  enableAuditLog: boolean;
  cloudModel: string;
  /** Used automatically when the primary cloud model times out or is overloaded. */
  cloudFallbackModel: string;
  categories: Record<EntityCategory, boolean>;
  /** Where the policy came from — shown in the HUD so admins can verify rollout. */
  source: 'remote' | 'defaults';
  fetchedAt: number | null;
}

export type RedactionEngine = 'nano' | 'fallback';

export interface RedactionResult {
  original: string;
  sanitized: string;
  spans: RedactedSpan[];
  engine: RedactionEngine;
  latencyMs: number;
  /** Number of network requests issued while Stage 1 ran (should always be 0). */
  networkCallsDuringStage: number;
  /** If Nano was attempted and failed, why. */
  nanoError?: string;
}

/** A segment of re-hydrated output: either plain text or a restored entity. */
export type HydratedSegment =
  | { kind: 'text'; text: string }
  | { kind: 'entity'; token: string; value: string; type: EntityType | null }
  | { kind: 'unknown-token'; token: string };

export interface ChatTurn {
  role: 'user' | 'model';
  /** Sanitized text — the only representation that is ever sent to the cloud. */
  sanitized: string;
}
