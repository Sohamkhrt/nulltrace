import { describe, expect, it } from 'vitest';
import { LocalVault } from './localVault';
import {
  EgressViolationError,
  mergeDetections,
  reasonInCloud,
  redactLocally,
  runHybridPipeline,
  scanEgress,
  type CloudReasoner,
} from './hybridPipeline';
import { luhnValid, regexDetect } from './regexSafetyNet';
import { DEFAULT_POLICY } from './policy';
import { FAKE_CREDS, PRESETS } from '../data/presets';
import type { RedactionPolicy } from './types';

const policy: RedactionPolicy = { ...DEFAULT_POLICY, categories: { ...DEFAULT_POLICY.categories } };

const echoReasoner: CloudReasoner = {
  model: 'test',
  simulated: true,
  async generate(history) {
    return { text: `Echo: ${history[history.length - 1].sanitized}`, inferenceSource: 'TEST' };
  },
};

describe('regex safety net', () => {
  it('catches AWS keys, sk- keys, JWTs and DSNs', () => {
    const text = `key=${FAKE_CREDS.awsKeyId} tok ${FAKE_CREDS.openAiKey}
jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
postgresql://u:p@10.0.0.1:5432/db`;
    const types = regexDetect(text, policy).map((d) => d.type);
    expect(types).toContain('AWS_ACCESS_KEY');
    expect(types).toContain('API_KEY');
    expect(types).toContain('JWT');
    expect(types).toContain('CONNECTION_STRING');
  });

  it('validates cards with Luhn', () => {
    expect(luhnValid('4111 1111 1111 1111')).toBe(true);
    expect(luhnValid('4111 1111 1111 1112')).toBe(false);
  });

  it('respects category toggles', () => {
    const off: RedactionPolicy = { ...policy, categories: { ...policy.categories, PII: false } };
    expect(regexDetect('mail me: a.b@example.com', off)).toHaveLength(0);
    expect(regexDetect('mail me: a.b@example.com', policy)).toHaveLength(1);
  });

  it('always enforces custom blocked terms', () => {
    const p: RedactionPolicy = { ...policy, customBlockedTerms: ['Bluefin'] };
    expect(regexDetect('the bluefin deal', p)[0]?.type).toBe('BLOCKED_TERM');
  });
});

describe('merge + vault', () => {
  it('resolves overlaps preferring the longest span', () => {
    const text = 'postgresql://u:pw@10.0.0.1/db';
    const merged = mergeDetections(text, regexDetect(text, policy));
    expect(merged).toHaveLength(1);
    expect(merged[0].type).toBe('CONNECTION_STRING');
  });

  it('assigns deterministic tokens and re-hydrates', async () => {
    const vault = new LocalVault();
    const r = await redactLocally('Email jane@corp.com and again jane@corp.com', policy, vault);
    expect(r.sanitized).toBe('Email [EMAIL_1] and again [EMAIL_1]');
    const segs = vault.rehydrate('Contact [EMAIL_1] or EMAIL_1, not [EMAIL_9].');
    expect(segs.filter((s) => s.kind === 'entity')).toHaveLength(2);
    expect(segs.some((s) => s.kind === 'unknown-token')).toBe(true);
    expect(vault.rehydrateToString('to [EMAIL_1]')).toBe('to jane@corp.com');
  });

  it('wipe clears everything', async () => {
    const vault = new LocalVault();
    await redactLocally('call 415-555-0142', policy, vault);
    expect(vault.size).toBe(1);
    vault.wipe();
    expect(vault.size).toBe(0);
  });
});

describe('demo presets: zero PII egress', () => {
  for (const preset of PRESETS) {
    it(`${preset.title} leaks nothing`, async () => {
      const vault = new LocalVault();
      const run = await runHybridPipeline(preset.prompt, [], policy, vault, { reasoner: echoReasoner });
      const scan = scanEgress(run.redaction.sanitized, vault.protectedValues());
      expect(scan.leakedBytes).toBe(0);
      expect(run.redaction.spans.length).toBeGreaterThan(5);
      // Re-hydrated output restores the original text exactly.
      const restored = run.hydrated.map((s) => (s.kind === 'text' ? s.text : s.kind === 'entity' ? s.value : s.token)).join('');
      expect(restored).toBe(`Echo: ${preset.prompt}`);
    });
  }

  it('AWS preset shields every credential', async () => {
    const vault = new LocalVault();
    const r = await redactLocally(PRESETS[0].prompt, policy, vault);
    for (const secret of [FAKE_CREDS.awsKeyId, FAKE_CREDS.awsSecret, 'Tr0ub4dor&3x', '10.42.7.20', 'Priya Raman']) {
      expect(r.sanitized).not.toContain(secret);
    }
  });

  it('HIPAA preset shields identifiers but keeps clinical content', async () => {
    const vault = new LocalVault();
    const r = await redactLocally(PRESETS[1].prompt, policy, vault);
    for (const v of ['Eleanor Whitfield', '412-68-3317', 'SAMC-0048213', '03/14/1958', 'Okafor', 'clara.whitfield@gmail.com', 'BCX-77310925']) {
      expect(r.sanitized).not.toContain(v);
    }
    expect(r.sanitized).toContain('apixaban');
    expect(r.sanitized).toContain('pneumonia');
  });

  it('M&A preset shields parties, amounts and codenames', async () => {
    const vault = new LocalVault();
    const r = await redactLocally(PRESETS[2].prompt, policy, vault);
    for (const v of ['Halcyon Dynamics', 'Veridian Biosciences', '$2.85 billion', '$114 million', 'Vivian Castellanos', 'Julian Ashford', 'Theodore Lin', 'Bluefin', 'NIGHTINGALE']) {
      expect(r.sanitized).not.toContain(v);
    }
  });
});

describe('egress guard', () => {
  it('fails closed if a protected value would leave the device', async () => {
    const vault = new LocalVault();
    vault.tokenize('Eleanor Whitfield', 'PERSON');
    await expect(
      reasonInCloud([{ role: 'user', sanitized: 'Summarize Eleanor Whitfield chart' }], echoReasoner, vault),
    ).rejects.toBeInstanceOf(EgressViolationError);
  });

  it('short values match whole words only', () => {
    expect(scanEgress('annual report', ['Ann']).leakedValues).toHaveLength(0);
    expect(scanEgress('ask Ann today', ['Ann']).leakedValues).toHaveLength(1);
  });
});
