import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { NullTraceState } from '../hooks/useNullTrace';
import { policyLabel } from '../services/policy';

export type View = 'workspace' | 'policy' | 'audit';

type Tone = 'go' | 'wait' | 'stop' | 'neutral';
const DOT: Record<Tone, string> = {
  go: 'bg-[#2fbf71]',
  wait: 'bg-yellow',
  stop: 'bg-[#ff5a4e]',
  neutral: 'bg-sign-ink-2',
};

function Status({ label, value, tone, title }: { label: string; value: string; tone: Tone; title?: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-center border-sign-3 px-4 sm:border-l sm:px-3.5 sm:first:border-l-0 xl:px-4" title={title}>
      <span className="text-[11px] font-medium leading-none text-sign-ink-2">{label}</span>
      <span className="mt-1.5 flex items-center gap-1.5 truncate text-[13.5px] font-bold leading-none text-sign-ink">
        <span className={`size-2 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden />
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}

export function SignBar({ s, view, setView }: { s: NullTraceState; view: View; setView: (v: View) => void }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const nano =
    s.nanoStatus === 'available'
      ? { v: 'Gemini Nano 4 ready', t: 'go' as Tone }
      : s.nanoStatus === 'downloading'
        ? { v: `Downloading Nano${s.nanoProgress != null ? ` ${Math.round(s.nanoProgress * 100)}%` : ''}`, t: 'wait' as Tone }
        : s.nanoStatus === 'checking'
          ? { v: 'Checking device', t: 'neutral' as Tone }
          : { v: 'Local fallback engine', t: 'wait' as Tone };

  const appCheck =
    s.appCheck === 'attested'
      ? { v: 'Attested', t: 'go' as Tone }
      : s.appCheck === 'debug'
        ? { v: 'Attested (debug)', t: 'go' as Tone }
        : s.appCheck === 'pending'
          ? { v: 'Attesting', t: 'neutral' as Tone }
          : s.appCheck === 'failed'
            ? { v: 'Failed', t: 'stop' as Tone }
            : s.cloudSimulated
              ? { v: 'Offline demo', t: 'neutral' as Tone }
              : { v: 'Not set up', t: 'stop' as Tone };

  const nav: { id: View; label: string }[] = [
    { id: 'workspace', label: 'Workspace' },
    { id: 'policy', label: 'Policy' },
    { id: 'audit', label: 'Audit log' },
  ];

  return (
    <header className="on-sign bg-sign text-sign-ink">
      <div className="flex flex-wrap items-stretch gap-x-6">
        <div className="flex items-center gap-4 px-4 py-3 sm:gap-7 sm:px-5 lg:py-0">
          <span className="text-[21px] font-extrabold tracking-[-0.02em]">
            Null<span className="text-yellow">Trace</span>
          </span>
          <nav aria-label="Primary" className="flex h-full items-stretch gap-1">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                aria-current={view === n.id ? 'page' : undefined}
                className={`relative px-2 text-[14px] font-semibold whitespace-nowrap transition-colors sm:px-2.5 ${
                  view === n.id ? 'text-yellow' : 'text-sign-ink-2 hover:text-sign-ink'
                }`}
              >
                {n.label}
                {view === n.id && <span className="absolute inset-x-2.5 bottom-0 h-[3px] bg-yellow" aria-hidden />}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={() => setStatusOpen((o) => !o)}
          aria-expanded={statusOpen}
          aria-controls="status-signs"
          className="flex w-full items-center gap-2 border-t border-sign-3 px-4 py-2.5 text-left text-[13px] font-semibold text-sign-ink sm:hidden"
        >
          <span className="flex gap-1" aria-hidden>
            {[nano.t, appCheck.t, 'go' as Tone, (s.cloudSimulated ? 'neutral' : 'go') as Tone].map((t, i) => (
              <span key={i} className={`size-2 rounded-full ${DOT[t]}`} />
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {nano.v} · {policyLabel(s.policy)}
          </span>
          <ChevronDown size={16} className={`shrink-0 text-sign-ink-2 transition-transform ${statusOpen ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        <div
          id="status-signs"
          className={`ml-auto w-full grid-cols-2 gap-y-3 border-t border-sign-3 py-3 sm:grid sm:grid-cols-4 lg:w-auto lg:border-t-0 lg:py-3 ${
            statusOpen ? 'grid' : 'hidden'
          }`}
        >
          <Status label="On-device engine" value={nano.v} tone={nano.t} />
          <Status label="App Check" value={appCheck.v} tone={appCheck.t} />
          <Status
            label={s.policy.source === 'remote' ? 'Policy · Remote Config' : 'Policy · built-in defaults'}
            value={policyLabel(s.policy)}
            tone="go"
          />
          <Status
            label={s.cloudSimulated ? 'Cloud · simulated' : 'Cloud model'}
            value={s.cloudModel}
            tone={s.cloudSimulated ? 'neutral' : 'go'}
            title={s.cloudSimulated ? 'No Firebase project configured: Stage 2 is answered locally by a simulator.' : undefined}
          />
        </div>
      </div>
    </header>
  );
}
