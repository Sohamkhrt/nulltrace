/**
 * Firebase bootstrap: App, App Check, AI Logic, and Remote Config.
 *
 * NullTrace degrades gracefully: if no Firebase config is present the app runs
 * in "offline demo" mode (local redaction is fully real; Stage 2 is answered
 * by a clearly-labelled local simulator so judges can still see the flow).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  getToken,
  type AppCheck,
} from 'firebase/app-check';
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';
import {
  getRemoteConfig,
  fetchAndActivate,
  getBoolean,
  getString,
  onConfigUpdate,
  activate,
  type RemoteConfig,
} from 'firebase/remote-config';
import { buildPolicy, REMOTE_CONFIG_DEFAULTS } from '../services/policy';
import type { RedactionPolicy } from '../services/types';

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

export type AppCheckStatus = 'attested' | 'debug' | 'failed' | 'not-configured' | 'pending';

export interface FirebaseServices {
  app: FirebaseApp;
  ai: AI;
  appCheck: AppCheck | null;
  remoteConfig: RemoteConfig | null;
}

let services: FirebaseServices | null = null;

export function getFirebase(): FirebaseServices | null {
  if (!isFirebaseConfigured) return null;
  if (services) return services;

  const app = initializeApp(firebaseConfig);

  // ---- App Check: attest every AI Logic request (reCAPTCHA Enterprise / v3 + dev debug token) ----
  let appCheck: AppCheck | null = null;
  const siteKey = env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  if (env.DEV) {
    // A stable token from a gitignored .env.local, or `true` to auto-generate one
    // (printed in the console; register it under App Check > Manage debug tokens).
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = (env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined) || true;
  }
  if (siteKey || env.DEV) {
    appCheck = initializeAppCheck(app, {
      // The provider must match what is registered in Firebase console > App Check.
      // "Fraud Defense" / reCAPTCHA Enterprise (the default) or classic reCAPTCHA v3.
      provider:
        (env.VITE_APPCHECK_PROVIDER as string | undefined) === 'v3'
          ? new ReCaptchaV3Provider(siteKey || 'debug-provider-placeholder')
          : new ReCaptchaEnterpriseProvider(siteKey || 'debug-provider-placeholder'),
      isTokenAutoRefreshEnabled: true,
    });
  }

  // ---- AI Logic: limited-use App Check tokens for replay protection ----
  const ai = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: Boolean(appCheck) });

  // ---- Remote Config ----
  let remoteConfig: RemoteConfig | null = null;
  try {
    remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = env.DEV ? 30_000 : 3_600_000;
    remoteConfig.settings.fetchTimeoutMillis = 8_000;
    remoteConfig.defaultConfig = { ...REMOTE_CONFIG_DEFAULTS };
  } catch (err) {
    console.warn('[NullTrace] Remote Config unavailable, using local defaults.', err);
  }

  services = { app, ai, appCheck, remoteConfig };
  return services;
}

export async function checkAppCheck(): Promise<AppCheckStatus> {
  const fb = getFirebase();
  if (!fb) return 'not-configured';
  if (!fb.appCheck) return 'not-configured';
  try {
    const res = await getToken(fb.appCheck);
    if (!res.token) return 'failed';
    return env.DEV ? 'debug' : 'attested';
  } catch (err) {
    console.warn('[NullTrace] App Check token failed:', err);
    return 'failed';
  }
}

function readPolicy(rc: RemoteConfig, source: RedactionPolicy['source']): RedactionPolicy {
  return buildPolicy(
    {
      policy_mode: getString(rc, 'policy_mode'),
      policy_version: getString(rc, 'policy_version'),
      custom_blocked_terms: getString(rc, 'custom_blocked_terms'),
      enable_audit_log: getBoolean(rc, 'enable_audit_log'),
      cloud_model: getString(rc, 'cloud_model'),
      cloud_model_fallback: getString(rc, 'cloud_model_fallback'),
    },
    source,
  );
}

/**
 * Fetch the enterprise redaction policy. Also subscribes to real-time Remote
 * Config updates so a security admin's publish reaches open sessions within
 * seconds — no redeploy.
 */
export async function loadRemotePolicy(onUpdate: (p: RedactionPolicy) => void): Promise<RedactionPolicy | null> {
  const fb = getFirebase();
  if (!fb?.remoteConfig) return null;
  const rc = fb.remoteConfig;
  try {
    await fetchAndActivate(rc);
    try {
      onConfigUpdate(rc, {
        next: async () => {
          await activate(rc);
          onUpdate(readPolicy(rc, 'remote'));
        },
        error: (e) => console.warn('[NullTrace] Remote Config realtime error', e),
        complete: () => undefined,
      });
    } catch {
      // Realtime updates are best-effort.
    }
    return readPolicy(rc, 'remote');
  } catch (err) {
    console.warn('[NullTrace] Remote Config fetch failed, using defaults.', err);
    return null;
  }
}
