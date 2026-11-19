import { useDeferredValue, useMemo, useState } from 'react';
import { useNullTrace } from './hooks/useNullTrace';
import { redactDeterministic } from './services/hybridPipeline';
import { SignBar, type View } from './components/SignBar';
import { NanoNotice } from './components/NanoNotice';
import { Lanes } from './components/Lanes';
import { RedChannel } from './components/RedChannel';
import { GreenChannel } from './components/GreenChannel';
import { ManifestStrip } from './components/ManifestStrip';
import { PolicyView } from './components/PolicyView';
import { AuditView } from './components/AuditView';

export default function App() {
  const s = useNullTrace();
  const [view, setView] = useState<View>('workspace');
  const [draft, setDraft] = useState('');
  const deferredDraft = useDeferredValue(draft);

  // Side-effect-free preview of the draft as it would cross, on a forked vault.
  const preview = useMemo(
    () => (deferredDraft.trim() ? redactDeterministic(deferredDraft, s.policy, s.vault.fork()) : null),
    // vaultRev tracks vault mutations so tokens stay consistent with what was already sent.
    [deferredDraft, s.policy, s.vault, s.vaultRev],
  );

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <SignBar s={s} view={view} setView={setView} />
      <NanoNotice status={s.nanoStatus} progress={s.nanoProgress} onDownload={() => void s.downloadNano()} />

      {view === 'workspace' && (
        <>
          <Lanes s={s} />
          <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(78vh,auto)_minmax(60vh,auto)] lg:grid-cols-2 lg:grid-rows-1">
            <RedChannel s={s} draft={draft} setDraft={setDraft} />
            <GreenChannel s={s} preview={preview} />
          </main>
        </>
      )}
      {view === 'policy' && (
        <main className="flex min-h-0 flex-1 flex-col">
          <PolicyView s={s} draft={draft} />
        </main>
      )}
      {view === 'audit' && (
        <main className="flex min-h-0 flex-1 flex-col">
          <AuditView s={s} />
        </main>
      )}

      <ManifestStrip s={s} />
    </div>
  );
}
