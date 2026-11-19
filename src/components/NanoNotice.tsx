import { useState } from 'react';
import { ChevronDown, Download, Info, X } from 'lucide-react';
import type { NanoStatus } from '../services/aiAdapters';

const STEPS: { flag?: string; text: string }[] = [
  { text: 'Use desktop Chrome 139 or newer with about 22 GB free disk space.' },
  { flag: 'chrome://flags/#optimization-guide-on-device-model', text: 'Set to Enabled BypassPerfRequirement.' },
  { flag: 'chrome://flags/#prompt-api-for-gemini-nano', text: 'Set to Enabled.' },
  { flag: 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input', text: 'Set to Enabled.' },
  { text: 'Relaunch Chrome, come back here, and choose Download Gemini Nano.' },
];

const HIDE_KEY = 'nulltrace.nanoNoticeHidden';

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export function NanoNotice({ status, progress, onDownload }: { status: NanoStatus; progress: number | null; onDownload: () => void }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(readHidden);
  if (status === 'available' || status === 'checking') return null;
  const downloading = status === 'downloading';
  if (hidden && !downloading) return null;

  const downloadable = status === 'downloadable';
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDE_KEY, '1');
    } catch {
      /* private mode: dismiss for this session only */
    }
  };

  return (
    <div role="status" className="border-b border-[#ecd9a0] bg-yellow-tint text-[13.5px]">
      <div className="flex items-center gap-2.5 px-4 py-1.5 sm:px-5">
        <Info size={15} strokeWidth={2.25} className="shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 sm:truncate">
          {downloading ? (
            <>
              <b>Downloading Gemini Nano{progress != null ? `: ${Math.round(progress * 100)}%` : '…'}</b>
              <span className="hidden sm:inline"> The local engine keeps inspecting meanwhile.</span>
            </>
          ) : (
            <>
              <b className="sm:hidden">Nano {downloadable ? 'not downloaded' : 'off'} · local engine</b>
              <b className="hidden sm:inline">Gemini Nano is {downloadable ? 'not downloaded' : 'off'} in this browser.</b>
              <span className="hidden sm:inline"> Inspection uses the local rule engine instead, still entirely on this device.</span>
            </>
          )}
        </p>
        {downloadable && (
          <button
            onClick={onDownload}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-sign bg-sign px-2.5 py-1 text-[12.5px] font-bold text-sign-ink hover:bg-sign-2"
          >
            <Download size={14} aria-hidden /> <span className="hidden sm:inline">Download</span> Nano
          </button>
        )}
        {!downloading && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex shrink-0 items-center gap-1 rounded-sign px-2 py-1 font-bold hover:bg-[#f7e3a6]"
          >
            <span className="sm:hidden">Enable</span>
            <span className="hidden sm:inline">How to enable</span> <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        )}
        {!downloading && (
          <button onClick={dismiss} aria-label="Dismiss notice" className="shrink-0 rounded-sign p-1 hover:bg-[#f7e3a6]">
            <X size={15} aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <ol className="grid gap-x-8 gap-y-2 px-4 pt-1 pb-3 sm:pl-[2.6rem] md:grid-cols-2">
          {STEPS.map((st, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="font-bold">{i + 1}.</span>
              <span>
                {st.flag && (
                  <code className="mr-1.5 select-all rounded-[2px] bg-white px-1.5 py-0.5 font-mono text-[11.5px] break-all shadow-[inset_0_0_0_1px_#ecd9a0]">
                    {st.flag}
                  </code>
                )}
                {st.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
