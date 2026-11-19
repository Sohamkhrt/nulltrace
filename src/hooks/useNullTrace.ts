import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { checkAppCheck, getFirebase, isFirebaseConfigured, loadRemotePolicy, type AppCheckStatus } from '../config/firebase';
import {
  checkNanoAvailability,
  DirectNanoExtractor,
  FirebaseCloudReasoner,
  FirebaseNanoExtractor,
  SimulatedCloudReasoner,
  type NanoStatus,
} from '../services/aiAdapters';
import {
  EgressViolationError,
  runHybridPipeline,
  scanEgress,
  type CloudReasoner,
  type EgressScan,
  type OnDeviceExtractor,
  type PipelineStage,
} from '../services/hybridPipeline';
import { LocalVault } from '../services/localVault';
import { DEFAULT_POLICY } from '../services/policy';
import type { ChatTurn, EntityCategory, HydratedSegment, RedactedSpan, RedactionEngine, RedactionPolicy } from '../services/types';
import { ENTITY_META } from '../services/types';
import { networkMonitor, onWire, type WireRecord } from '../services/wireTap';

export interface Message {
  id: string;
  role: 'user' | 'model';
  sanitized: string;
  original?: string;
  spans?: RedactedSpan[];
  segments?: HydratedSegment[];
  engine?: RedactionEngine;
  localMs?: number;
  cloudMs?: number;
  inferenceSource?: string;
  model?: string;
  error?: string;
  ts: number;
}

export interface WireEvent {
  record: WireRecord;
  scan: EgressScan;
}

export interface AuditEvent {
  id: number;
  ts: number;
  action: 'REDACT' | 'EGRESS' | 'BLOCKED' | 'WIPE' | 'POLICY';
  detail: string;
}

export interface Metrics {
  shielded: number;
  localMs: number | null;
  cloudMs: number | null;
  leakedBytes: number;
  sentBytes: number;
  cloudRequests: number;
  stage1NetworkCalls: number;
}

let msgSeq = 0;
const newId = () => `m${Date.now().toString(36)}${(msgSeq++).toString(36)}`;

export function useNullTrace() {
  const vault = useMemo(() => new LocalVault(), []);
  const vaultRev = useSyncExternalStore(
    (cb) => vault.subscribe(cb),
    () => vault.revision,
  );

  const [policy, setPolicy] = useState<RedactionPolicy>(DEFAULT_POLICY);
  const [nanoStatus, setNanoStatus] = useState<NanoStatus>('checking');
  const [nanoProgress, setNanoProgress] = useState<number | null>(null);
  const [appCheck, setAppCheck] = useState<AppCheckStatus>(isFirebaseConfigured ? 'pending' : 'not-configured');
  const [messages, setMessages] = useState<Message[]>([]);
  const [wire, setWire] = useState<WireEvent[]>([]);
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    shielded: 0,
    localMs: null,
    cloudMs: null,
    leakedBytes: 0,
    sentBytes: 0,
    cloudRequests: 0,
    stage1NetworkCalls: 0,
  });

  const policyRef = useRef(policy);
  policyRef.current = policy;
  const auditSeq = useRef(0);
  const seenWire = useRef(new Set<number>());

  const log = useCallback((action: AuditEvent['action'], detail: string) => {
    if (!policyRef.current.enableAuditLog) return;
    setAudit((a) => [{ id: ++auditSeq.current, ts: Date.now(), action, detail }, ...a].slice(0, 200));
  }, []);

  // ── Boot: Nano availability, App Check, Remote Config ──
  useEffect(() => {
    void checkNanoAvailability().then(setNanoStatus);
    if (isFirebaseConfigured) void checkAppCheck().then(setAppCheck);

    const applyRemote = (remote: RedactionPolicy) => {
      log('POLICY', `Remote Config policy ${remote.mode} v${remote.version} activated`);
      // Remote values win; the user's local category toggles are preserved.
      setPolicy((cur) => ({ ...remote, categories: cur.categories }));
    };
    void loadRemotePolicy(applyRemote).then((p) => p && applyRemote(p));
  }, [log]);

  // ── Live wire tap: scan every captured outbound AI request against the vault ──
  useEffect(
    () =>
      onWire((record) => {
        // A request is published once when it leaves and again when it completes;
        // the second publish only updates its status.
        if (seenWire.current.has(record.id)) {
          setWire((w) => w.map((e) => (e.record.id === record.id ? { ...e, record } : e)));
          return;
        }
        seenWire.current.add(record.id);
        const scan = scanEgress(record.body, vault.protectedValues());
        setWire((w) => [{ record, scan }, ...w].slice(0, 50));
        setMetrics((m) => ({
          ...m,
          leakedBytes: m.leakedBytes + scan.leakedBytes,
          sentBytes: m.sentBytes + scan.payloadBytes,
          cloudRequests: m.cloudRequests + 1,
        }));
        log('EGRESS', `${record.method} ${record.host} — ${scan.payloadBytes} B sent, ${scan.leakedBytes} B protected data`);
      }),
    [vault, log],
  );

  // ── Engines ──
  const extractor = useMemo<OnDeviceExtractor | null>(() => {
    if (nanoStatus !== 'available') return null;
    const fb = getFirebase();
    return fb ? new FirebaseNanoExtractor(fb.ai) : new DirectNanoExtractor();
  }, [nanoStatus]);

  const reasoner = useMemo<CloudReasoner>(() => {
    const fb = getFirebase();
    return fb
      ? new FirebaseCloudReasoner(fb.ai, policy.cloudModel, policy.cloudFallbackModel)
      : new SimulatedCloudReasoner(policy.cloudModel);
  }, [policy.cloudModel, policy.cloudFallbackModel]);

  /** Kick off the Gemini Nano download (must be triggered by a user gesture). */
  const downloadNano = useCallback(async () => {
    setNanoStatus('downloading');
    setNanoProgress(0);
    try {
      const fb = getFirebase();
      if (fb) {
        await new FirebaseNanoExtractor(fb.ai).initialize((p) => setNanoProgress(p));
      } else if (typeof LanguageModel !== 'undefined' && LanguageModel) {
        const s = await LanguageModel.create({
          monitor: (m) =>
            m.addEventListener('downloadprogress', (e) => setNanoProgress((e as unknown as { loaded: number }).loaded)),
        });
        s.destroy();
      }
    } catch (err) {
      console.warn('[NullTrace] Nano download failed', err);
    }
    setNanoProgress(null);
    setNanoStatus(await checkNanoAvailability());
  }, []);

  const history = useCallback(
    // Only completed exchanges: a user turn whose reply failed is dropped too,
    // so the cloud always receives strictly alternating user/model turns.
    (msgs: Message[]): ChatTurn[] => {
      const turns: ChatTurn[] = [];
      for (let i = 0; i < msgs.length; i++) {
        const m = msgs[i];
        const reply = msgs[i + 1];
        if (m.role === 'user' && reply?.role === 'model' && !reply.error) {
          turns.push({ role: 'user', sanitized: m.sanitized }, { role: 'model', sanitized: reply.sanitized });
          i++;
        }
      }
      return turns;
    },
    [],
  );

  const send = useCallback(
    async (input: string) => {
      const text = input.trim();
      if (!text || (stage !== 'idle' && stage !== 'done' && stage !== 'error')) return;

      const prior = history(messages);
      const userId = newId();
      const modelId = newId();

      try {
        const run = await runHybridPipeline(text, prior, policyRef.current, vault, {
          extractor,
          reasoner,
          network: networkMonitor,
          onStage: (s, info) => {
            setStage(s);
            if (s === 'guarding' && info?.redaction) {
              const r = info.redaction;
              setMessages((ms) => [
                ...ms,
                {
                  id: userId,
                  role: 'user',
                  original: text,
                  sanitized: r.sanitized,
                  spans: r.spans,
                  engine: r.engine,
                  localMs: r.latencyMs,
                  ts: Date.now(),
                },
              ]);
              setMetrics((m) => ({
                ...m,
                shielded: m.shielded + r.spans.length,
                localMs: r.latencyMs,
                stage1NetworkCalls: r.networkCallsDuringStage,
              }));
              const cats = [...new Set(r.spans.map((sp) => ENTITY_META[sp.type].category))].join(', ') || 'none';
              log('REDACT', `${r.spans.length} entities shielded via ${r.engine === 'nano' ? 'Gemini Nano' : 'local NER'} (${cats}) in ${r.latencyMs} ms`);
              if (r.nanoError) log('REDACT', `Nano error, deterministic engine used: ${r.nanoError}`);
            }
          },
        });
        setMetrics((m) => ({ ...m, cloudMs: run.cloud.latencyMs }));
        setMessages((ms) => [
          ...ms,
          {
            id: modelId,
            role: 'model',
            sanitized: run.cloud.text,
            segments: run.hydrated,
            cloudMs: run.cloud.latencyMs,
            inferenceSource: run.cloud.inferenceSource,
            model: run.cloud.model,
            ts: Date.now(),
          },
        ]);
        setStage('done');
      } catch (err) {
        setStage('error');
        let message = err instanceof Error ? err.message : String(err);
        if (err instanceof EgressViolationError) {
          log('BLOCKED', message);
        } else if (/app.?check/i.test(message)) {
          message =
            'Google refused the request because App Check could not vouch for this browser. Nothing was sent. ' +
            'If you are running locally, copy the App Check debug token from the browser console and add it in the Firebase console under App Check → Apps → Manage debug tokens, then try again.';
        } else if (/403|permission/i.test(message)) {
          message =
            'Google refused the request (permission denied). Nothing protected was sent. Check that Firebase AI Logic is enabled for this project (firebase init ailogic) and that App Check allows this app.';
        } else if (/high demand|overloaded|unavailable|\b50[0234]\b|timeout|timed out|abort|deadline/i.test(message)) {
          message =
            'Gemini is overloaded or too slow right now, and the fallback model did not answer either. Nothing protected was sent. Wait a moment and try again.';
        } else if (/failed to fetch|network/i.test(message)) {
          message = 'The cloud could not be reached. Check your connection and try again; your values are still held on this device.';
        }
        setMessages((ms) => [
          ...ms,
          { id: modelId, role: 'model', sanitized: '', error: message, ts: Date.now() },
        ]);
      }
    },
    [extractor, reasoner, vault, messages, history, stage, log],
  );

  const wipe = useCallback(() => {
    const n = vault.size;
    vault.wipe();
    setMessages([]);
    setWire([]);
    setStage('idle');
    setMetrics((m) => ({ ...m, localMs: null, cloudMs: null }));
    log('WIPE', `Panic wipe: ${n} vault entries destroyed, workspace cleared`);
  }, [vault, log]);

  const toggleCategory = useCallback((c: EntityCategory) => {
    setPolicy((p) => ({ ...p, categories: { ...p.categories, [c]: !p.categories[c] } }));
  }, []);

  const setMode = useCallback((mode: RedactionPolicy['mode']) => setPolicy((p) => ({ ...p, mode })), []);

  return {
    vault,
    vaultRev,
    policy,
    toggleCategory,
    setMode,
    nanoStatus,
    nanoProgress,
    downloadNano,
    appCheck,
    cloudSimulated: reasoner.simulated,
    cloudModel: reasoner.model,
    messages,
    wire,
    stage,
    audit,
    metrics,
    send,
    wipe,
  };
}

export type NullTraceState = ReturnType<typeof useNullTrace>;
