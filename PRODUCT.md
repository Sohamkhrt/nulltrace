# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: professionals who handle confidential material daily (developers with production credentials, clinicians with patient notes, lawyers with deal documents) and want frontier cloud AI without disclosing it.

First session matters most: the product is entered in the Firebase #BuildHybridAI 2026 hackathon, so a judge opening it cold for ~2 minutes must grasp the mechanism within seconds, via 1-click scenarios. Daily-work usability comes second but must not be sacrificed.

## Product Purpose

NullTrace lets a person ask a cloud LLM (Gemini via Firebase AI Logic) about confidential text while no PII, secret, or trade-secret value ever leaves the browser. Success: the answer is as useful as sending the raw text, and the person can *see* — not just be told — that nothing sensitive was transmitted.

## Positioning

A 3-stage hybrid pipeline with observable proof: on-device redaction (Gemini Nano, plus a deterministic regex/NER safety net) replaces every sensitive value with a placeholder token kept in an in-memory vault; only the sanitized text reaches the cloud; the answer is re-hydrated locally. The actual outbound request bytes are captured off `fetch()` and scanned against the vault, so "0 bytes of protected data sent" is measured, not claimed.

## Operating Context

- Input: typed/pasted text, code, or local `.txt/.md/.json`-style files (read in-browser, never uploaded).
- Three built-in scenarios: production AWS key leak (developer), HIPAA patient discharge (physician), confidential M&A clause (counsel). All data in them is fictitious.
- Runs in desktop Chrome; Gemini Nano is often unavailable, in which case a deterministic local engine takes over with no loss of function.
- Without Firebase credentials the cloud stage is answered by a clearly labelled local simulator.

## Capabilities and Constraints

- Stages: local redaction → egress guard (fails closed) → cloud reasoning → local re-hydration.
- Live telemetry: entities shielded, local latency, cloud latency, protected bytes egressed, network calls during stage 1.
- Outbound wire inspector showing the captured request (headers masked) with tokens highlighted; live draft preview of what would be sent.
- Local vault (token ↔ real value) with reveal/mask and a panic wipe that clears vault, conversation and wire log.
- Redaction policy from Firebase Remote Config: `policy_mode` strict/standard, `custom_blocked_terms`, `enable_audit_log`, `cloud_model`; per-category toggles (PII, Secrets, Financial, Medical, Corporate IP) take effect immediately.
- Local-only audit log (counts and categories, never values).
- Status: on-device engine availability (with Nano download / enable instructions), App Check attestation, policy source and version, cloud model.
- Stack: React + Vite + TypeScript + Tailwind CSS v4 + lucide-react; Firebase Hosting SPA.
- Layout, navigation, and structure are free to change; all functions above must remain.

## Brand Commitments

- Name: NullTrace. No other binding visual assets.
- Must not read as: a generic dark security dashboard (Linear/Vercel-clone), a hacker/terminal costume, or anything playful. Must not be so dense that a first-time viewer can't tell what is happening within ~5 seconds.

## Evidence on Hand

- Pipeline unit tests proving zero protected-byte egress on all three scenarios (`src/services/hybridPipeline.test.ts`).
- No customers, testimonials, certifications, or benchmarks exist; none may be implied (e.g. no "HIPAA compliant" badge).

## Product Principles

1. Show, don't assert: every privacy claim on screen is backed by a measurement the user can inspect.
2. Real data stays legible to its owner; only the cloud sees placeholders.
3. Fail closed and say so plainly.
4. The mechanism must be graspable in one look; depth is available, never required.
5. Trustworthy enough for a clinician or general counsel to use on a real document.

## Accessibility & Inclusion

No product-specific standard established; WCAG 2.2 AA as baseline, full keyboard operation, reduced-motion respected.
