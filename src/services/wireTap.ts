/**
 * Wire Tap: wraps window.fetch so the Live Wire Inspector shows the *actual*
 * bytes the Firebase AI Logic SDK puts on the network — not a reconstruction.
 *
 * It also counts every outbound request, which lets Stage 1 prove it made
 * zero network calls while redacting.
 */
import type { NetworkMonitor } from './hybridPipeline';

export interface WireRecord {
  id: number;
  ts: number;
  method: string;
  url: string;
  host: string;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  simulated: boolean;
  status?: number;
}

type Listener = (rec: WireRecord) => void;

const AI_HOSTS = ['firebasevertexai.googleapis.com', 'generativelanguage.googleapis.com', 'aiplatform.googleapis.com'];

let installed = false;
let requestCounter = 0;
let nextId = 1;
const listeners = new Set<Listener>();
const encoder = new TextEncoder();

function maskHeader(name: string, value: string): string {
  const n = name.toLowerCase();
  if (n === 'x-firebase-appcheck') return `${value.slice(0, 10)}… (App Check JWT, ${value.length} chars)`;
  if (n === 'x-goog-api-key') return `${value.slice(0, 6)}… (public Firebase web API key)`;
  if (n === 'authorization') return `${value.split(' ')[0]} … (redacted)`;
  if (n === 'x-firebase-gmpid' || n === 'x-firebase-appid') return value;
  return value;
}

function headersToRecord(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  new Headers(h).forEach((v, k) => {
    out[k] = maskHeader(k, v);
  });
  return out;
}

async function bodyToString(body: BodyInit | null | undefined): Promise<string> {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (body instanceof Blob) return body.text();
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(body as ArrayBuffer);
  }
  return '[stream body]';
}

function emit(rec: WireRecord) {
  for (const l of listeners) l(rec);
}

export function installWireTap(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    requestCounter += 1;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let host = '';
    try {
      host = new URL(url, window.location.href).host;
    } catch {
      /* ignore */
    }
    if (!AI_HOSTS.some((h) => host.endsWith(h))) return original(input, init);

    const reqInit = init ?? {};
    const method = reqInit.method ?? (input instanceof Request ? input.method : 'GET');
    let body = await bodyToString(reqInit.body);
    if (!body && input instanceof Request) body = await input.clone().text();
    const headers = headersToRecord(reqInit.headers ?? (input instanceof Request ? input.headers : undefined));
    const rec: WireRecord = {
      id: nextId++,
      ts: Date.now(),
      method,
      url: url.replace(/([?&]key=)[^&]+/, '$1…'),
      host,
      headers,
      body,
      bytes: encoder.encode(body).length,
      simulated: false,
    };
    // Publish the instant it leaves, so the inspector shows it while in transit,
    // then publish again (same id) once the outcome is known.
    emit({ ...rec });
    try {
      const res = await original(input, init);
      emit({ ...rec, status: res.status });
      return res;
    } catch (err) {
      emit({ ...rec, status: 0 }); // network failure, timeout or abort
      throw err;
    }
  };
}

export function onWire(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Simulated cloud requests are published through the same channel, flagged as such. */
export function emitSimulated(url: string, body: string): void {
  emit({
    id: nextId++,
    ts: Date.now(),
    method: 'POST',
    url,
    host: new URL(url).host,
    headers: {
      'content-type': 'application/json',
      'x-firebase-appcheck': '(simulated — no Firebase project configured)',
    },
    body,
    bytes: encoder.encode(body).length,
    simulated: true,
    status: 200,
  });
}

export const networkMonitor: NetworkMonitor = {
  requestCount: () => requestCounter,
};
