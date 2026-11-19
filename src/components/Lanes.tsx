import { ChevronRight, CircleCheck, Lock, OctagonX, ScanSearch, ShieldCheck, Undo2, CircleDot } from 'lucide-react';
import type { NullTraceState } from '../hooks/useNullTrace';
import { ENTITY_META } from '../services/types';

const GATE: Record<NullTraceState['stage'], { text: string; Icon: typeof Lock }> = {
  idle: { text: 'Gate open', Icon: CircleDot },
  redacting: { text: '1 of 4 · Inspecting on device', Icon: ScanSearch },
  guarding: { text: '2 of 4 · Checking payload', Icon: ShieldCheck },
  cloud: { text: '3 of 4 · In transit to Gemini', Icon: ChevronRight },
  rehydrating: { text: '4 of 4 · Restoring values', Icon: Undo2 },
  done: { text: 'Cleared', Icon: CircleCheck },
  error: { text: 'Held at the gate', Icon: OctagonX },
};

/**
 * The customs channels. Red holds what must be declared (real values, on this
 * device); green carries only what has nothing to declare (placeholders, to the
 * cloud). The gate between them shows where the current message is.
 */
export function Lanes({ s }: { s: NullTraceState }) {
  const gate = GATE[s.stage];
  const transit = s.stage === 'cloud';
  const held = s.vault.size;
  const latest = s.vault.entries().slice(-3).reverse();
  const cleared = s.metrics.cloudRequests;

  return (
    <div className="relative grid grid-cols-2 text-white">
      <div className="flex min-h-14 items-center gap-3 bg-red py-2.5 pr-3 pl-4 md:pr-36 md:pl-5">
        <Lock size={22} strokeWidth={2.5} className="hidden shrink-0 sm:block" aria-hidden />
        <div className="min-w-0 leading-tight">
          <div className="text-[15px] font-extrabold tracking-[-0.01em] sm:text-[17px] md:text-[19px]">Goods to declare</div>
          <div className="truncate text-[13px] font-semibold text-white">
            <span className="font-bold text-white">{held}</span> held<span className="hidden sm:inline"> on this device</span>
          </div>
        </div>
        {latest.length > 0 && (
          <ul aria-label="Most recently held" className="ml-auto hidden min-w-0 items-center gap-1.5 2xl:flex">
            {latest.map((e) => (
              <li
                key={e.token}
                className="animate-rise max-w-[11rem] truncate rounded-[2px] bg-red-deep px-2 py-1 text-[12px] font-semibold text-white"
                title={`${ENTITY_META[e.type].label} held on this device`}
              >
                {ENTITY_META[e.type].label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-h-14 items-center justify-end gap-3 bg-green py-2.5 pr-4 pl-3 text-right md:pr-5 md:pl-36">
        <div className="min-w-0 leading-tight">
          <div className="text-[15px] font-extrabold tracking-[-0.01em] sm:text-[17px] md:text-[19px]">Nothing to declare</div>
          <div className="truncate text-[13px] font-semibold text-white">
            <span className="font-bold text-white">{cleared}</span> {s.cloudSimulated ? 'simulated' : 'cleared'}
            <span className="hidden sm:inline"> {s.cloudSimulated ? (cleared === 1 ? 'request' : 'requests') : 'to Google'}</span>
          </div>
        </div>
        <span className="hidden shrink-0 sm:flex" aria-hidden>
          {[0, 1, 2].map((i) => (
            <ChevronRight
              key={i}
              size={20}
              strokeWidth={3}
              className={`-ml-2 first:ml-0 ${transit ? 'animate-march' : 'opacity-60'}`}
              style={transit ? { animationDelay: `${i * 140}ms` } : undefined}
            />
          ))}
        </span>
      </div>

      {/* The gate. */}
      <div
        className={`col-span-2 flex justify-center md:pointer-events-none md:absolute md:inset-y-0 md:left-1/2 md:-translate-x-1/2 md:items-center md:bg-transparent ${
          s.stage === 'error' ? 'bg-sign' : 'bg-sign md:bg-transparent'
        }`}
      >
        <div
          aria-live="polite"
          className={`flex items-center gap-2 rounded-sign px-3 py-1.5 text-[13px] font-bold whitespace-nowrap text-white md:px-4 md:py-2 md:text-[14px] md:font-extrabold md:shadow-[0_3px_10px_rgba(20,20,20,0.28)] ${
            s.stage === 'error' ? 'bg-sign' : 'md:bg-yellow md:text-ink'
          }`}
        >
          <gate.Icon size={17} strokeWidth={2.75} className={s.stage === 'error' ? '' : 'text-yellow md:text-current'} aria-hidden />
          <span>{gate.text}</span>
        </div>
      </div>
    </div>
  );
}
