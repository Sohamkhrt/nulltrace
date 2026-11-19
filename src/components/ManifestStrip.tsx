import type { NullTraceState } from '../hooks/useNullTrace';

function Figure({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-1 border-l border-sign-3 px-4 py-2.5 md:px-5">
      <span className="text-[12.5px] leading-tight font-medium text-sign-ink-2">{label}</span>
      <span className="text-[22px] leading-none font-extrabold tracking-[-0.02em] text-sign-ink md:text-[26px]">
        {value}
        {unit && <span className="ml-1 text-[13px] font-semibold tracking-normal text-sign-ink-2">{unit}</span>}
      </span>
    </div>
  );
}

/** The declaration manifest: what this session held, sent and leaked. */
export function ManifestStrip({ s }: { s: NullTraceState }) {
  const m = s.metrics;
  const leaked = m.leakedBytes;
  return (
    <footer aria-label="Session manifest" className="on-sign grid grid-cols-2 bg-sign text-sign-ink md:grid-cols-[1.35fr_repeat(4,1fr)]">
      <div className="col-span-2 flex items-end justify-between gap-4 px-5 py-2.5 md:col-span-1">
        <div>
          <span className="block text-[13px] font-semibold text-sign-ink-2">Protected data that left this device</span>
          <span
            className={`mt-1 block text-[44px] leading-[0.9] font-extrabold tracking-[-0.035em] md:text-[48px] ${
              leaked === 0 ? 'text-yellow' : 'text-[#ff5a4e]'
            }`}
          >
            {leaked.toLocaleString()}
            <span className="ml-1.5 text-[22px] tracking-normal">bytes</span>
          </span>
        </div>
      </div>
      <Figure label="Values held on device" value={m.shielded.toLocaleString()} />
      <Figure label="Inspection on device" value={m.localMs == null ? '–' : m.localMs.toFixed(m.localMs < 10 ? 1 : 0)} unit="ms" />
      <Figure
        label={s.cloudSimulated ? 'Gemini round trip (simulated)' : 'Gemini round trip'}
        value={m.cloudMs == null || s.cloudSimulated ? '–' : m.cloudMs.toLocaleString()}
        unit={s.cloudSimulated ? undefined : 'ms'}
      />
      <Figure label={s.cloudSimulated ? 'Placeholder text (not sent)' : 'Placeholder text sent'} value={m.sentBytes.toLocaleString()} unit="bytes" />
    </footer>
  );
}
