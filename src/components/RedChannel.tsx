import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRight, Check, Copy, FileUp, KeyRound, Loader2, OctagonX, Scale, Stethoscope, TriangleAlert } from 'lucide-react';
import type { Message, NullTraceState } from '../hooks/useNullTrace';
import { PRESETS, type DemoPreset } from '../data/presets';
import { Answer, Original } from './Rich';

const PRESET_ICON: Record<DemoPreset['id'], typeof KeyRound> = { aws: KeyRound, hipaa: Stethoscope, mna: Scale };
const MAX_FILE_BYTES = 512 * 1024;
const BUSY = new Set(['redacting', 'guarding', 'cloud', 'rehydrating']);

function UserTurn({ m }: { m: Message }) {
  const n = m.spans?.length ?? 0;
  return (
    <article className="animate-rise">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 text-[13px]">
        <span className="font-bold">You</span>
        <span className="text-ink-3">
          <b className="text-red-ink">{n}</b> {n === 1 ? 'value' : 'values'} held · {m.engine === 'nano' ? 'Gemini Nano' : 'local engine'} ·{' '}
          {m.localMs} ms
        </span>
      </header>
      <div className="rounded-sign bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(20,20,20,0.06),inset_0_0_0_1px_var(--color-line)]">
        <Original text={m.original ?? ''} spans={m.spans ?? []} />
      </div>
    </article>
  );
}

function ModelTurn({ m, s }: { m: Message; s: NullTraceState }) {
  const [copied, setCopied] = useState(false);
  if (m.error) {
    const blocked = m.error.startsWith('Egress guard');
    return (
      <article role="alert" className="animate-rise rounded-sign bg-white px-4 py-3.5 shadow-[inset_0_0_0_2px_var(--color-red)]">
        <p className="flex items-center gap-2 text-[15px] font-extrabold text-red-ink">
          {blocked ? <OctagonX size={18} aria-hidden /> : <TriangleAlert size={18} aria-hidden />}
          {blocked ? 'Stopped at the gate: nothing was sent' : 'The cloud step failed'}
        </p>
        <p className="mt-1.5 text-[14px] text-ink-2">{m.error}</p>
      </article>
    );
  }
  return (
    <article className="animate-rise">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 text-[13px]">
        <span className="font-bold">
          Gemini <span className="font-medium text-ink-3">· real values restored on this device</span>
        </span>
        <span className="flex items-center gap-2 text-ink-3">
          {m.inferenceSource === 'SIMULATED' ? 'simulated' : m.model ?? m.inferenceSource?.toLowerCase().replace('_', ' ')} ·{' '}
          {(m.cloudMs ?? 0) >= 1000 ? `${((m.cloudMs ?? 0) / 1000).toFixed(1)} s` : `${m.cloudMs} ms`}
          <button
            onClick={() => {
              void navigator.clipboard.writeText(s.vault.rehydrateToString(m.sanitized));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1 rounded-sign px-1.5 py-0.5 font-semibold text-ink hover:bg-white"
          >
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </header>
      <div className="border-t-2 border-ink pt-3.5">
        <Answer text={m.sanitized} hydrate={(t) => s.vault.rehydrate(t)} />
      </div>
    </article>
  );
}

const STAGE_TEXT: Record<string, string> = {
  redacting: 'Inspecting on this device…',
  guarding: 'Checking the outbound payload…',
  cloud: 'Gemini is reasoning on the placeholders…',
  rehydrating: 'Restoring real values…',
};

export function RedChannel({ s, draft, setDraft }: { s: NullTraceState; draft: string; setDraft: (v: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const busy = BUSY.has(s.stage);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy]);
  const empty = s.messages.length === 0;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [s.messages.length, s.stage]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    void s.send(draft);
    setDraft('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  const loadPreset = (p: DemoPreset) => {
    setDraft(p.prompt);
    textarea.current?.focus();
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(txt|md|json|log|csv|py|js|ts|env|ya?ml)$/i.test(f.name)) {
      setFileNote(`${f.name} isn’t a text file. Use .txt, .md, .json or source code.`);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileNote(`${f.name} is over 512 KB. Split it and load the part you need.`);
      return;
    }
    const text = await f.text(); // Read in the browser; never uploaded.
    setDraft(`${draft ? `${draft}\n\n` : ''}--- ${f.name} ---\n${text}`);
    setFileNote(`${f.name} loaded on this device (${f.size.toLocaleString()} bytes). Nothing uploaded.`);
  };

  return (
    <section aria-label="Goods to declare: your workspace" className="flex min-h-0 flex-col bg-floor">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="mx-auto max-w-[720px] px-6 pt-6 pb-4">
            <h1 className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.025em] text-balance">
              Ask Gemini about things you can’t share.
            </h1>
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
              Real values stay here in the red channel; Gemini only ever receives placeholders, and its answer comes back with your
              values restored.
            </p>
            <h2 className="mt-5 mb-2 text-[14px] font-bold">Try a scenario</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-sign bg-white shadow-[inset_0_0_0_1px_var(--color-line)]">
              {PRESETS.map((p) => {
                const Icon = PRESET_ICON[p.id];
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => loadPreset(p)}
                      className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-yellow-tint focus-visible:bg-yellow-tint"
                    >
                      <Icon size={18} strokeWidth={2.25} className="shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 sm:truncate">
                        <span className="block font-bold sm:inline">{p.title}</span>
                        <span className="block text-[13.5px] leading-snug text-ink-3 sm:inline sm:text-[15px]">
                          <span className="hidden sm:inline"> · </span>
                          {p.persona}, {p.subtitle.charAt(0).toLowerCase() + p.subtitle.slice(1)}
                        </span>
                      </span>
                      <ArrowRight size={17} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[820px] flex-col gap-7 px-6 py-6">
            {s.messages.map((m) => (m.role === 'user' ? <UserTurn key={m.id} m={m} /> : <ModelTurn key={m.id} m={m} s={s} />))}
            {busy && (
              <p aria-live="polite" className="flex items-center gap-2 text-[14px] font-semibold text-ink-2">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                {STAGE_TEXT[s.stage]}
                {elapsed >= 3 && <span className="font-normal text-ink-3 tabular-nums">{elapsed} s</span>}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-line bg-panel px-4 pt-3 pb-4 md:px-6">
        {!empty && (
          <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto">
            <span className="mr-1 shrink-0 text-[13px] font-semibold text-ink-3">Scenarios</span>
            {PRESETS.map((p) => {
              const Icon = PRESET_ICON[p.id];
              return (
                <button
                  key={p.id}
                  disabled={busy}
                  onClick={() => loadPreset(p)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sign px-2.5 py-1 text-[13px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-white disabled:opacity-50"
                >
                  <Icon size={14} aria-hidden /> {p.title}
                </button>
              );
            })}
          </div>
        )}
        <div className="rounded-sign bg-white shadow-[inset_0_0_0_1.5px_var(--color-line-strong)] focus-within:shadow-[inset_0_0_0_2px_var(--color-ink)]">
          <label htmlFor="prompt" className="sr-only">
            Your message
          </label>
          <textarea
            id="prompt"
            ref={textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={3}
            spellCheck={false}
            placeholder="Paste text, code or a document. Real values stay on this device."
            className="block max-h-64 w-full resize-y bg-transparent px-4 pt-3.5 font-mono text-[12.5px] leading-[1.7] placeholder:font-sans placeholder:text-[15px] placeholder:text-ink-3 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2 px-2.5 pb-2.5">
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,.json,.log,.csv,.py,.js,.ts,.env,.yml,.yaml,text/plain,application/json,text/markdown"
              className="hidden"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-sign px-2 py-1.5 text-[13.5px] font-semibold text-ink-2 hover:bg-floor hover:text-ink"
            >
              <FileUp size={16} aria-hidden /> Load a file
            </button>
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">{fileNote ?? 'Ctrl + Enter to send'}</span>
            <button
              onClick={submit}
              disabled={!draft.trim() || busy}
              className="inline-flex items-center gap-2 rounded-sign bg-yellow px-4 py-2 text-[15px] font-extrabold text-ink shadow-[0_2px_6px_rgba(20,20,20,0.18)] transition-[background-color,box-shadow] hover:bg-yellow-2 hover:shadow-[0_4px_12px_rgba(20,20,20,0.22)] active:translate-y-px disabled:cursor-not-allowed disabled:bg-floor disabled:text-ink-3 disabled:shadow-none"
            >
              {busy ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <ArrowRight size={17} strokeWidth={2.75} aria-hidden />}
              Clear customs
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
