# NullTrace

**Zero-trust hybrid AI workspace.** Use cloud LLMs on confidential code, patient notes and contracts. No PII, API key or trade secret leaves your device.

> Firebase **#BuildHybridAI 2026** Hackathon entry · React + Vite + TypeScript + Tailwind · Firebase AI Logic, App Check, Remote Config, Hosting

| | Pure cloud | Pure on-device | **NullTrace (hybrid)** |
|---|---|---|---|
| Reasoning quality | ✅ frontier | ❌ limited | ✅ frontier (Gemini in the cloud) |
| Data privacy | ❌ raw data leaves device | ✅ | ✅ only placeholders leave device |
| Compliance (HIPAA / NDA / SOC 2) | ❌ | ✅ | ✅ verifiable 0-byte PII egress |

---

## How it works

```
 ┌──────────────────────────── YOUR BROWSER (trusted) ─────────────────────────────┐
 │                                                                                 │
 │  "Fix my code: AWS_KEY=AKIA…  contact priya@acme.com"                           │
 │                      │                                                          │
 │                      ▼                                                          │
 │  ┌───────────────── STAGE 1 · LOCAL REDACTION (0 network calls) ─────────────┐  │
 │  │  Gemini Nano  (Firebase AI Logic · InferenceMode.ONLY_ON_DEVICE,          │  │
 │  │               JSON responseConstraint → {entities:[{text,type}]})          │  │
 │  │       +  Regex safety net  (AKIA…, sk-…, JWT, PEM, DSN, SSN, Luhn cards,   │  │
 │  │                             entropy ≥ 4.2 bits/char in strict mode)        │  │
 │  │       +  Deterministic NER (names, orgs, codenames; fallback brain)        │  │
 │  │       +  Remote Config custom_blocked_terms                                │  │
 │  └────────────────────────────────┬───────────────────────────────────────────┘  │
 │                                   │ "Fix my code: AWS_KEY=[SECRET_KEY_1]          │
 │     ┌──────────────────────┐      │  contact [EMAIL_1]"                           │
 │     │ LOCAL VAULT (in RAM) │◄─────┤                                               │
 │     │ [SECRET_KEY_1]↔AKIA… │      ▼                                               │
 │     │ [EMAIL_1]↔priya@…    │   EGRESS GUARD — scans payload for every vault       │
 │     └──────────┬───────────┘   value; fails CLOSED if a single byte would leak    │
 │                │                  │                                               │
 └────────────────┼──────────────────┼───────────────────────────────────────────────┘
                  │                  │  HTTPS + App Check token (reCAPTCHA)
                  │                  ▼
                  │   ┌──── STAGE 2 · CLOUD REASONING ────────────────────────┐
                  │   │ Gemini 3.5 Flash via Firebase AI Logic                │
                  │   │ InferenceMode.ONLY_IN_CLOUD                           │
                  │   │ system: "preserve [TOKEN_X] placeholders verbatim"    │
                  │   └──────────────────────┬────────────────────────────────┘
                  │                          │ "Rotate [SECRET_KEY_1]; notify [EMAIL_1]"
 ┌────────────────┼──────────────────────────┼───────────────────────────────────────┐
 │                ▼                          ▼                                       │
 │  STAGE 3 · LOCAL RE-HYDRATION → "Rotate AKIA…; notify priya@acme.com"             │
 │  (real values rendered as badges; hover shows the token the cloud actually saw)   │
 └───────────────────────────────────────────────────────────────────────────────────┘
```

### Proof, not promises
- **Captured, not reconstructed.** NullTrace wraps `window.fetch`, so the green channel shows the *actual bytes* the Firebase AI Logic SDK sends to `firebasevertexai.googleapis.com` (auth headers masked), with every placeholder highlighted.
- **Egress scanner.** Every captured request is scanned against every vault value. The verdict ("0 bytes of protected data in this request") and the manifest's **Protected data that left this device** figure are the sum of those scans. The guard also runs *before* sending and fails closed.
- **Stage 1 network calls.** The pipeline counts outbound requests made while inspection runs. The count is always `0`.

## The interface: a customs hall

Every message clears customs.

1. **Two channels.** The red *Goods to declare* channel holds your real values on this device. The green *Nothing to declare* channel shows exactly what Google receives.
2. **The gate.** A sign between the channels tracks the message through the four stages: *1 of 4 Inspecting on device*, *2 of 4 Checking payload*, *3 of 4 In transit to Gemini*, *4 of 4 Restoring values*. Then it reads **Cleared**, or **Held at the gate** if the egress guard blocks the send.
3. **Workspace (red channel).**
   - Your text shows every held value marked in red. Hover one to see the placeholder that crossed instead.
   - Gemini's answer comes back with real values restored, code blocks included.
   - Three 1-click scenarios: *Production AWS Key Leak*, *HIPAA Patient Discharge* and *Confidential M&A Contract*. All their data is fictitious.
4. **Inspection (green channel).**
   - A live preview of the draft while you type.
   - The captured request with its verdict and CLEARED stamp, plus request history.
   - A **Vault manifest** tab: placeholder ↔ real value, masked by default, with a two-step **Wipe vault** panic button.
5. **Session manifest.** One figure leads: protected bytes that left the device. Beside it are values held, on-device inspection time, Gemini round trip, and placeholder bytes sent.
6. **Policy page (Firebase Remote Config).** Shows `policy_mode`, `custom_blocked_terms`, `enable_audit_log` and `cloud_model`, with per-category switches (Personal identifiers / Secrets / Financial / Medical / Corporate IP). A live panel shows the effect of each switch. A realtime `onConfigUpdate` listener applies admin publishes to open sessions.
7. **Audit log.** A local-only record of held, sent, blocked, wiped and policy events. It keeps counts and categories, never values.
8. **Graceful fallback.** If Chrome's built-in Gemini Nano is missing, a one-line notice explains how to enable it, and the deterministic NER + regex engine takes over. Every feature keeps working.

**Offline demo mode:** with no Firebase config in `.env.local`, inspection and restoration run for real, and the cloud step is answered by a local simulator. The simulator is labelled *simulated* everywhere it appears. It receives the same sanitized payload, so the whole flow can be judged without credentials.

The visual system is documented in [`DESIGN.md`](./DESIGN.md).

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in your Firebase web config (optional for offline demo)
npm run dev                     # prints the local URL
npm test                        # pipeline unit tests (vitest)
npm run build                   # type-check + production build
```

## Enable Gemini Nano in Chrome

Requires **Chrome 139+ on desktop** (Windows 10/11, macOS 13+, Linux or ChromeOS) and about 22 GB of free disk space.

1. `chrome://flags/#optimization-guide-on-device-model` → **Enabled BypassPerfRequirement**
2. `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled**
3. `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` → **Enabled**
4. Relaunch Chrome. Open NullTrace and click **Download Gemini Nano** in the banner (the download must start from a user gesture). You can watch progress at `chrome://on-device-internals`.
5. You can also check in DevTools: `await LanguageModel.availability()` should return `"available"`.

When Nano is ready, the on-device engine sign reads **Gemini Nano 4 ready**, and Stage 1 adds semantic entity extraction to the regex safety net.

## Firebase setup & deployment

```bash
npm i -g firebase-tools            # or use npx firebase-tools@latest
firebase login
firebase use --add                 # pick your project
firebase init ailogic              # REQUIRED: provisions Firebase AI Logic (Gemini Developer API)
```

1. **Web app config.** Firebase console → Project settings → *Your apps* → Web. Copy the values into `.env.local`.
2. **App Check.** Register reCAPTCHA Enterprise (shown as *Fraud Defense*) under *App Check → Apps*, then set `VITE_RECAPTCHA_SITE_KEY` to its site key (set `VITE_APPCHECK_PROVIDER=v3` if you registered classic reCAPTCHA v3 instead). In `npm run dev`, NullTrace sets `self.FIREBASE_APPCHECK_DEBUG_TOKEN`, either to `VITE_APPCHECK_DEBUG_TOKEN` or to `true`, which prints a token to the console. Register that token under *Manage debug tokens*. Then enforce App Check for **Firebase AI Logic**. NullTrace requests limited-use tokens (`useLimitedUseAppCheckTokens: true`) for replay protection.
3. **Remote Config.** `firebase deploy --only remoteconfig` publishes `remoteconfig.template.json`:

   | key | type | default |
   |---|---|---|
   | `policy_mode` | string | `strict` (`strict` \| `standard`) |
   | `policy_version` | string | `1.4` |
   | `custom_blocked_terms` | JSON array | `["Project Nightingale","Bluefin","ACME-INTERNAL"]` |
   | `enable_audit_log` | boolean | `true` |
   | `cloud_model` | string | `gemini-3.5-flash` |

4. **Hosting.**
   ```bash
   npm run deploy                   # = npm run build && firebase deploy --only hosting
   ```
   `firebase.json` serves `dist/` as an SPA (all routes → `index.html`). It sets immutable caching for hashed assets and security headers (`nosniff`, `DENY` framing, `no-referrer`).

## Project layout

```
src/
  config/firebase.ts          App, App Check (reCAPTCHA Enterprise or v3 + debug token), AI Logic, Remote Config
  services/
    hybridPipeline.ts         3-stage orchestrator, detection merging, egress guard (framework-free)
    localVault.ts             in-memory token ↔ value map, re-hydration, wipe
    regexSafetyNet.ts         deterministic secret/PII patterns, Luhn, Shannon entropy
    localNer.ts               rule-based NER fallback (names, orgs, codenames)
    aiAdapters.ts             Firebase AI Logic ONLY_ON_DEVICE / ONLY_IN_CLOUD adapters
    wireTap.ts                fetch() interceptor powering the Wire Inspector
    policy.ts                 Remote Config defaults + parsing
    cloudSimulator.ts         offline Stage-2 stand-in (no Firebase config only)
    hybridPipeline.test.ts    unit tests incl. zero-egress checks on all presets
  components/                 SignBar, Lanes (gate), RedChannel, GreenChannel, ManifestStrip, PolicyView, AuditView, NanoNotice, Rich, Marks
```

## Security notes & limitations

- The vault exists only in JS memory. It is never written to storage, URLs or logs, and closing the tab destroys it. The audit log records counts and categories, never values.
- Redaction is defense in depth (LLM + deterministic rules), not a guarantee. Clinical content such as diagnoses and medications is kept on purpose so the cloud can reason about it. Identifiers are removed. Review the policy against your own compliance requirements.
- The Firebase web API key in the bundle is a public identifier, not a secret. Access is protected by App Check enforcement.

## License

[Apache License 2.0](./LICENSE)
