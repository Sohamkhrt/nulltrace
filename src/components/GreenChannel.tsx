import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CircleCheck, Eye, EyeOff, OctagonX, Radio, Trash2 } from 'lucide-react';
import type { NullTraceState, WireEvent } from '../hooks/useNullTrace';
import type { RedactedSpan } from '../services/types';
import { CATEGORY_LABELS, ENTITY_META } from '../services/types';
import { ClearedToken } from './Marks';

const TOKEN_SPLIT = /(\[[A-Z][A-Z_]*_\d+\])/g;

function withTokens(text: string): ReactNode {
  return text.split(TOKEN_SPLIT).map((p, i) => (i % 2 === 1 ? <ClearedToken key={i} token={p} /> : <Fragment key={i}>{p}</Fragment>));
}

function Json({ body }: { body: string }) {
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }, [body]);
  return (
    <pre className="font-mono text-[11.5px] leading-[1.8] text-ink-2">
      {pretty.split('\n').map((line, i) => {
        const m = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(:\s?)(.*)$/);
        return (
          <div key={i} className="break-all whitespace-pre-wrap">
            {m ? (
              <>
                {m[1]}
                <span className="text-ink-3">{m[2]}</span>
                {m[3]}
                <span className="text-ink">{withTokens(m[4])}</span>
              </>
            ) : (
              withTokens(line)
            )}
          </div>
        );
      })}
    </pre>
  );
}

function Verdict({ e }: { e: WireEvent }) {
  const clean = e.scan.leakedBytes === 0;
  return (
    <div
      key={e.record.id}
      className={`relative flex items-center gap-3 overflow-hidden rounded-sign px-4 py-3.5 text-white ${clean ? 'bg-green' : 'bg-red'}`}
    >
      {clean ? <CircleCheck size={24} strokeWidth={2.5} className="shrink-0" aria-hidden /> : <OctagonX size={24} className="shrink-0" aria-hidden />}
      <p className="min-w-0 flex-1 text-[14.5px] leading-snug">
        <b className="block text-[16px] font-extrabold">
          {clean
            ? '0 bytes of protected data in this request'
            : `${e.scan.leakedBytes.toLocaleString()} bytes of protected data found (${e.scan.leakedValues.length} values)`}
        </b>
        <span className="font-semibold text-white">
          Scanned all {e.scan.payloadBytes.toLocaleString()} bytes against every value in your vault
        </span>
      </p>
      <span
        aria-hidden
        className="animate-stamp hidden shrink-0 rounded-[2px] px-2.5 py-1 text-[13px] font-extrabold tracking-[0.08em] shadow-[inset_0_0_0_2.5px_currentColor] sm:block"
      >
        {clean ? 'CLEARED' : 'LEAK'}
      </span>
    </div>
  );
}

function Inspection({ s, preview }: { s: NullTraceState; preview: { sanitized: string; spans: RedactedSpan[] } | null }) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [s.wire.length]);
  const ev = s.wire.find((w) => w.record.id === picked) ?? s.wire[0];

  if (preview) {
    return (
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[16px] font-extrabold">Preview: what Gemini would receive</h2>
          <span className="text-[13px] text-ink-3">
            <b className="text-ink">{preview.spans.length}</b> {preview.spans.length === 1 ? 'value' : 'values'} would be held · not sent yet
          </span>
        </div>
        <div className="rounded-sign bg-white p-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
          <pre className="font-mono text-[11.5px] leading-[1.8] break-words whitespace-pre-wrap text-ink-2">{withTokens(preview.sanitized)}</pre>
        </div>
        <p className="max-w-[60ch] text-[13px] leading-relaxed text-ink-3">
          Updates as you type and as you change the policy. On send,{' '}
          {s.nanoStatus === 'available' ? 'Gemini Nano also inspects the text.' : 'the same local engine runs.'}
        </p>
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div className="max-w-[34ch]">
          <Radio size={26} className="mx-auto text-green" aria-hidden />
          <h2 className="mt-3 text-[17px] font-extrabold">Nothing has crossed yet</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">
            Each request to Google’s AI endpoint is captured here byte for byte, straight off the browser’s network call, and checked
            against your vault.
          </p>
        </div>
      </div>
    );
  }

  const r = ev.record;
  return (
    <div className="space-y-4 p-5">
      <Verdict e={ev} />

      <div className="rounded-sign bg-white shadow-[inset_0_0_0_1px_var(--color-line)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="rounded-[2px] bg-sign px-1.5 py-0.5 font-mono text-[11px] font-semibold text-sign-ink">{r.method}</span>
          <span className="min-w-0 flex-1 font-mono text-[11.5px] break-all text-ink">{r.url}</span>
          <span
            className={`rounded-[2px] px-1.5 py-0.5 text-[12px] font-bold ${
              r.simulated || r.status === 0 || (r.status ?? 200) >= 400
                ? 'bg-floor text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-strong)]'
                : 'bg-green-tint text-green-ink'
            }`}
          >
            {r.simulated
              ? 'Simulated, not sent'
              : r.status === undefined
                ? 'In transit · captured live'
                : r.status === 0
                  ? 'No response (timed out) · captured live'
                  : `${r.status} · captured live`}
          </span>
        </div>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 border-b border-line px-4 py-2.5 font-mono text-[11px]">
          {Object.entries(r.headers).map(([k, v]) => (
            <Fragment key={k}>
              <dt className="text-ink-3">{k}</dt>
              <dd className="break-all text-ink-2">{v}</dd>
            </Fragment>
          ))}
        </dl>
        <div className="px-4 py-3">
          <Json body={r.body} />
        </div>
      </div>

      {s.wire.length > 1 && (
        <div>
          <h3 className="mb-1.5 text-[14px] font-bold">Earlier requests</h3>
          <ul className="divide-y divide-line rounded-sign bg-white shadow-[inset_0_0_0_1px_var(--color-line)]">
            {s.wire.map((w) => (
              <li key={w.record.id}>
                <button
                  onClick={() => setPicked(w.record.id)}
                  aria-current={w.record.id === r.id}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[13.5px] ${
                    w.record.id === r.id ? 'bg-green-tint font-semibold' : 'hover:bg-floor'
                  }`}
                >
                  <span>
                    Request {w.record.id} · {new Date(w.record.ts).toLocaleTimeString()}
                  </span>
                  <span className={w.scan.leakedBytes ? 'font-bold text-red-ink' : 'text-green-ink'}>
                    {w.scan.payloadBytes.toLocaleString()} B · {w.scan.leakedBytes} B protected
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Manifest({ s }: { s: NullTraceState }) {
  const [reveal, setReveal] = useState(false);
  const [armed, setArmed] = useState(false);
  const entries = useMemo(() => s.vault.entries(), [s.vault, s.vaultRev]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);

  const canWipe = entries.length > 0 || s.messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-2">
          Each real value and the placeholder that replaced it. Kept only in this tab’s memory: never saved, never sent.
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setReveal((v) => !v)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 rounded-sign px-2.5 py-1.5 text-[13.5px] font-semibold hover:bg-white disabled:opacity-40"
          >
            {reveal ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            {reveal ? 'Hide values' : 'Show values'}
          </button>
          <button
            onClick={() => (armed ? (s.wipe(), setArmed(false)) : setArmed(true))}
            disabled={!canWipe}
            className={`inline-flex items-center gap-1.5 rounded-sign px-3 py-1.5 text-[13.5px] font-extrabold transition-colors disabled:opacity-40 ${
              armed ? 'bg-red text-white hover:bg-red-deep' : 'text-red-ink shadow-[inset_0_0_0_1.5px_var(--color-red)] hover:bg-red-tint'
            }`}
          >
            <Trash2 size={16} aria-hidden />
            {armed ? 'Confirm: destroy everything' : 'Wipe vault'}
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="grid flex-1 place-items-center p-8 text-center text-[14px] text-ink-3">
          The vault is empty. Send a message and its held values appear here.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead className="sticky top-0 z-10 bg-panel shadow-[inset_0_-1px_0_var(--color-line)]">
              <tr className="text-[12.5px] text-ink-3">
                <th scope="col" className="px-5 py-2 font-semibold">Sent as</th>
                <th scope="col" className="px-2 py-2 font-semibold">Real value</th>
                <th scope="col" className="px-5 py-2 text-right font-semibold">Kind</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.token} className="border-b border-line/70 align-top last:border-0">
                  <td className="px-5 py-2 font-mono text-[11.5px] whitespace-nowrap">
                    <ClearedToken token={e.token} />
                  </td>
                  <td className="max-w-0 px-2 py-2 font-mono text-[11.5px]">
                    <span
                      className={`block truncate text-red-ink transition-[filter] duration-200 ${reveal ? '' : 'blur-[5px] select-none hover:blur-none'}`}
                      title={reveal ? e.value : 'Hover to show'}
                    >
                      {e.value}
                    </span>
                  </td>
                  <td className="px-5 py-2 text-right text-[12.5px] whitespace-nowrap text-ink-3">
                    {CATEGORY_LABELS[ENTITY_META[e.type].category].title}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Tab = 'inspection' | 'manifest';

export function GreenChannel({ s, preview }: { s: NullTraceState; preview: { sanitized: string; spans: RedactedSpan[] } | null }) {
  const [tab, setTab] = useState<Tab>('inspection');
  return (
    <section aria-label="Nothing to declare: what the cloud receives" className="flex min-h-0 flex-col border-line bg-[#eef1ec] lg:border-l">
      <div role="tablist" aria-label="Green channel views" className="flex gap-1 border-b border-line bg-panel px-4">
        {(
          [
            ['inspection', 'Inspection', s.wire.length],
            ['manifest', 'Vault manifest', s.vault.size],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`relative -mb-px flex items-center gap-2 px-3 py-3 text-[14px] font-bold transition-colors ${
              tab === id ? 'text-ink' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {label}
            {count > 0 && <span className="rounded-[2px] bg-floor px-1.5 text-[12px] font-bold text-ink-2">{count}</span>}
            {tab === id && <span className="absolute inset-x-2 bottom-0 h-[3px] bg-green" aria-hidden />}
          </button>
        ))}
        <span className="ml-auto hidden self-center text-[12.5px] text-ink-3 md:block">
          Network calls while inspecting:{' '}
          <b className={s.metrics.stage1NetworkCalls ? 'text-red-ink' : 'text-green-ink'}>{s.metrics.stage1NetworkCalls}</b>
        </span>
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'inspection' ? <Inspection s={s} preview={preview} /> : <Manifest s={s} />}
      </div>
    </section>
  );
}
