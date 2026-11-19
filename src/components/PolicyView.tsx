import { Fragment, useMemo } from 'react';
import { CloudDownload } from 'lucide-react';
import type { NullTraceState } from '../hooks/useNullTrace';
import { PRESETS } from '../data/presets';
import { redactDeterministic } from '../services/hybridPipeline';
import { policyLabel } from '../services/policy';
import { ALL_CATEGORIES, CATEGORY_LABELS, ENTITY_META, type EntityCategory } from '../services/types';
import { ClearedToken } from './Marks';

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-green' : 'bg-line-strong'}`}
    >
      <span
        className={`absolute top-[3px] left-0 size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(20,20,20,0.3)] transition-transform duration-200 ease-[var(--ease-out-expo)] ${
          on ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

const SPLIT = /(\[[A-Z][A-Z_]*_\d+\])/g;

export function PolicyView({ s, draft }: { s: NullTraceState; draft: string }) {
  const p = s.policy;
  const sample = draft.trim() ? draft : PRESETS[0].prompt;

  const counts = useMemo(() => {
    const c = Object.fromEntries(ALL_CATEGORIES.map((k) => [k, 0])) as Record<EntityCategory, number>;
    for (const e of s.vault.entries()) c[ENTITY_META[e.type].category] += 1;
    return c;
  }, [s.vault, s.vaultRev]);

  const effect = useMemo(() => redactDeterministic(sample, p, s.vault.fork()), [sample, p, s.vault, s.vaultRev]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.025em]">{policyLabel(p)}</h1>
          <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-2">
            <CloudDownload size={17} aria-hidden className={p.source === 'remote' ? 'text-green' : 'text-ink-3'} />
            {p.source === 'remote'
              ? `From Firebase Remote Config, fetched ${p.fetchedAt ? new Date(p.fetchedAt).toLocaleTimeString() : ''}. Admin changes apply here live.`
              : 'Built-in defaults. Connect a Firebase project to manage this policy from Remote Config.'}
          </p>

          <h2 className="mt-8 text-[17px] font-extrabold">Inspection mode</h2>
          <div role="radiogroup" aria-label="Inspection mode" className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                ['strict', 'Strict', 'Also flags high-entropy strings and any bare date.'],
                ['standard', 'Standard', 'Known patterns, names, organisations and policy terms.'],
              ] as const
            ).map(([id, title, desc]) => (
              <button
                key={id}
                role="radio"
                aria-checked={p.mode === id}
                onClick={() => s.setMode(id)}
                className={`rounded-sign px-4 py-3 text-left transition-shadow ${
                  p.mode === id ? 'bg-white shadow-[inset_0_0_0_2px_var(--color-ink)]' : 'bg-panel shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white'
                }`}
              >
                <span className="block text-[15px] font-bold">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{desc}</span>
              </button>
            ))}
          </div>

          <h2 className="mt-8 text-[17px] font-extrabold">What must be declared</h2>
          <ul className="mt-3 divide-y divide-line rounded-sign bg-white shadow-[inset_0_0_0_1px_var(--color-line)]">
            {ALL_CATEGORIES.map((c) => (
              <li key={c} className="flex items-center gap-4 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                    {CATEGORY_LABELS[c].title}
                    {counts[c] > 0 && (
                      <span className="rounded-[2px] bg-red-tint px-1.5 text-[12px] font-bold text-red-ink">{counts[c]} held now</span>
                    )}
                  </p>
                  <p className="text-[13.5px] text-ink-3">{CATEGORY_LABELS[c].blurb}</p>
                </div>
                <Switch on={p.categories[c]} onChange={() => s.toggleCategory(c)} label={CATEGORY_LABELS[c].title} />
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-[17px] font-extrabold">Always held</h2>
          <p className="mt-1 text-[13.5px] text-ink-3">Terms your security admin blocks, whatever the switches above say.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.customBlockedTerms.length === 0 && <span className="text-[14px] text-ink-3">None set.</span>}
            {p.customBlockedTerms.map((t) => (
              <span key={t} className="rounded-[2px] bg-sign px-2 py-1 text-[13px] font-semibold text-sign-ink">
                {t}
              </span>
            ))}
          </div>

          <dl className="mt-8 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-t-2 border-ink pt-4 text-[14px]">
            {(
              [
                ['Audit log', p.enableAuditLog ? 'On (kept on this device only)' : 'Off'],
                ['Cloud model', p.cloudModel],
                ['Fallback model', p.cloudFallbackModel],
                ['Policy version', p.version],
              ] as const
            ).map(([k, v]) => (
              <Fragment key={k}>
                <dt className="font-bold">{k}</dt>
                <dd className="text-ink-2">{v}</dd>
              </Fragment>
            ))}
          </dl>
        </div>

        <div className="lg:sticky lg:top-0 lg:self-start">
          <h2 className="text-[17px] font-extrabold">Effect on {draft.trim() ? 'your draft' : `the “${PRESETS[0].title}” scenario`}</h2>
          <p className="mt-1 text-[13.5px] text-ink-3">
            <b className="text-ink">{effect.spans.length}</b> values would be held. Flip a switch and watch this change.
          </p>
          <div className="mt-3 max-h-[70vh] overflow-y-auto rounded-sign bg-white p-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <pre className="font-mono text-[11.5px] leading-[1.8] break-words whitespace-pre-wrap text-ink-2">
              {effect.sanitized.split(SPLIT).map((part, i) => (i % 2 === 1 ? <ClearedToken key={i} token={part} /> : <Fragment key={i}>{part}</Fragment>))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
