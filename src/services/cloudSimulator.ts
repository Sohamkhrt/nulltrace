/**
 * Offline stand-in for Stage 2, used ONLY when no Firebase project is
 * configured. It sees exactly what the real cloud model would see — the
 * sanitized prompt — and answers using the placeholder tokens, so Stage 3
 * re-hydration is demonstrated end-to-end. The UI labels it "SIMULATED".
 */

function tokensByPrefix(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const m of text.matchAll(/\[([A-Z][A-Z_]*)_(\d+)\]/g)) {
    const list = map.get(m[1]) ?? [];
    if (!list.includes(m[0])) list.push(m[0]);
    map.set(m[1], list);
  }
  return map;
}

export function simulateCloudAnswer(sanitized: string): string {
  const t = tokensByPrefix(sanitized);
  const pick = (prefix: string, i = 0, fallback = 'the referenced entity') => t.get(prefix)?.[i] ?? fallback;
  const lower = sanitized.toLowerCase();

  if (/boto3|psycopg2|```python|def \w+\(/.test(sanitized)) {
    const keys = t.get('SECRET_KEY') ?? [];
    const conn = pick('CONN_STRING', 0, 'DB_DSN');
    const ips = t.get('IP') ?? [];
    return `## Root cause

1. **\`SignatureDoesNotMatch\`** — \`region_name="us-east-1 "\` has a **trailing space**. SigV4 signs the region into the credential scope, so the signature computed locally never matches what S3 expects.
2. **DB timeout** — a new \`psycopg2\` connection is opened on *every* upload and never closed or committed, exhausting the pool on the database behind ${ips[0] ?? 'the primary'}.
3. **SQL injection** — \`"... VALUES ('%s')" % path\` interpolates user-controlled input directly into SQL.

## Critical: rotate these credentials now
${keys.length ? keys.map((k) => `- ${k} is hard-coded in source — revoke and rotate it.`).join('\n') : '- Hard-coded credentials detected — rotate them.'}
- ${conn} embeds a plaintext password — move it to a secret manager.

## Refactored, safe version

\`\`\`python
import os
import boto3
from psycopg2.pool import SimpleConnectionPool

# Credentials come from the environment / IAM role — never from source.
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1").strip())
pool = SimpleConnectionPool(1, 10, dsn=os.environ["DB_DSN"])  # was: ${conn}

def upload(path: str, bucket: str = os.environ["UPLOAD_BUCKET"]) -> None:
    s3.upload_file(path, bucket, os.path.basename(path))
    conn = pool.getconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("INSERT INTO uploads (path) VALUES (%s)", (path,))
    finally:
        pool.putconn(conn)
\`\`\`

## Hardening checklist
- Prefer an **IAM role** (instance profile / IRSA) over static keys; then delete ${keys[0] ?? 'the static key'} entirely.
- Add a pre-commit secret scanner (e.g. \`gitleaks\`) — this file would have been blocked.
- Point the failover at ${ips[1] ?? 'the replica'} via a connection-string list instead of a comment.
- Notify ${pick('PERSON', 0, 'the on-call engineer')} (${pick('EMAIL', 0, 'on-call')}) that the keys were exposed so the rotation is tracked.`;
  }

  if (/discharge|mrn|patient|admitted/.test(lower)) {
    const patient = pick('PERSON', 0, 'the patient');
    const doctor = t.get('PERSON')?.find((p) => p !== patient) ?? 'the attending physician';
    const people = t.get('PERSON') ?? [];
    const family = people.length > 2 ? people[people.length - 1] : 'the emergency contact';
    return `## Plain-language summary for ${patient}'s family

${patient} was admitted to ${pick('ORG', 0, 'the hospital')} with **pneumonia** (a lung infection). During the stay, the heart also developed an **irregular, fast rhythm called atrial fibrillation**.

- **The infection** was treated with IV antibiotics and is now being finished with **oral amoxicillin-clavulanate** at home.
- **The heart rhythm** is controlled with **metoprolol**, which slows the heart rate.
- Because atrial fibrillation raises stroke risk (risk score 4), ${patient} now takes **apixaban 5 mg twice daily**, a blood thinner. *Do not skip doses.*
- The heart ultrasound showed **normal pumping strength (55%)**.

## Follow-up actions
| When | What | With |
|---|---|---|
| Within 7 days | Post-discharge check, review antibiotics & rhythm | ${doctor} |
| Within 2 weeks | Cardiology visit for atrial fibrillation | Cardiology |
| Daily | Take apixaban & metoprolol; watch for bleeding | ${patient} |

## Call ${doctor} at ${pick('PHONE', 0, 'the clinic')} or 911 if
- Fever returns, breathing worsens, or chest pain occurs
- Black stools, blood in urine, or unusual bruising (blood-thinner side effects)
- Fainting or a racing heartbeat

*Records reference: ${pick('MEDICAL_ID', 0, 'MRN on file')}. Emergency contact on file: ${family}.*`;
  }

  if (/merger|acqui|termination fee|parent/.test(lower)) {
    const parent = pick('ORG', 0, 'Parent');
    const company = pick('ORG', 1, 'the Company');
    const amounts = t.get('AMOUNT') ?? [];
    return `## Clause review — ${pick('CODENAME', 0, pick('BLOCKED_TERM', 0, 'the transaction'))}, §7.3

**Structure.** ${parent} acquires ${company} for ${amounts[0] ?? 'the purchase price'} (60% cash / 40% stock). The company break fee is ${amounts[1] ?? 'the termination fee'}; the reverse (regulatory) fee is ${amounts[2] ?? 'the reverse fee'}.

### Break-fee mechanics
- ${amounts[1] ?? 'The termination fee'} is ~4.0% of equity value — at the high end of the typical 2–4% range, which favours the acquirer but invites a challenge under *Revlon* / enhanced scrutiny.
- The reverse fee (${amounts[2] ?? 'reverse fee'}, ~6%) is **larger** than the company fee, signalling that ${parent} bears most of the antitrust risk.

### Risks for the acquirer (${parent})
1. **Trigger is too narrow** — only a *Change of Recommendation* by the board led by ${pick('PERSON', 0, 'the Chair')} triggers payment. Add a **tail provision**: fee payable if the Company signs an alternative deal within 12 months after termination.
2. **"Two business days" without a wire mechanism** — specify the escrow account (${pick('IBAN', 0, 'escrow account')}) and late-payment interest.
3. **Stock component** — 40% stock without a collar exposes both sides to price swings between signing and close.
4. **No match right** — ${parent} should get 4 business days to match a Superior Proposal before the board may change its recommendation.

### Suggested language
> *"If this Agreement is terminated pursuant to Section 7.1(c) or 7.1(d), or if within twelve (12) months following termination the Company enters into a definitive agreement for an Acquisition Proposal, the Company shall pay to Parent ${amounts[1] ?? 'the Termination Fee'} by wire transfer of immediately available funds within two (2) Business Days."*

**Next step:** circulate to ${pick('PERSON', 2, 'deal counsel')} (${pick('EMAIL', 0, 'counsel')}) before ${pick('PERSON', 1, 'the signatory')} signs.`;
  }

  const all = [...t.values()].flat();
  return `I analysed your request using only the sanitized content. ${
    all.length
      ? `The following entities were referenced by placeholder: ${all.slice(0, 12).join(', ')}. I preserved them verbatim so they can be restored on your device.`
      : 'No sensitive entities were detected in this message.'
  }

*(Offline demo mode — connect a Firebase project in \`.env.local\` to get a real Gemini response.)*`;
}
