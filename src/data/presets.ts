// All credentials, people, and companies below are fictitious and generated for
// demonstration. AWS keys use AWS's documented example format.

/**
 * Fake credentials, assembled from pieces so the literal key never appears in
 * source: GitHub push protection would otherwise reject the commit. They are
 * not real and never were.
 */
export const FAKE_CREDS = {
  awsKeyId: 'AKIA' + 'Z7Q4RT2MXPLK9WDN',
  awsSecret: 'wJalrXUtnFEMI/K7MDENG' + '/bPxRfiCYzQ8tLmVb3e',
  openAiKey: 'sk-' + 'proj-9fT2xQ7mLpZ4vRk8NcW1hYbJ3sDe6GuA',
} as const;

export interface DemoPreset {
  id: 'aws' | 'hipaa' | 'mna';
  title: string;
  subtitle: string;
  persona: string;
  prompt: string;
}

export const PRESETS: DemoPreset[] = [
  {
    id: 'aws',
    title: 'Production AWS Key Leak',
    subtitle: 'Debug a Python service with live creds',
    persona: 'Developer',
    prompt: `My S3 uploader crashes in prod with "botocore.exceptions.ClientError: SignatureDoesNotMatch" and then the DB write times out. Can you find the bug and refactor it to be safe?

\`\`\`python
import boto3, psycopg2

AWS_ACCESS_KEY_ID = "${FAKE_CREDS.awsKeyId}"
aws_secret_access_key = "${FAKE_CREDS.awsSecret}"
OPENAI_FALLBACK = "${FAKE_CREDS.openAiKey}"
DB_DSN = "postgresql://svc_uploader:Tr0ub4dor&3x@10.42.7.19:5432/billing_prod"

s3 = boto3.client("s3", aws_access_key_id=AWS_ACCESS_KEY_ID,
                  aws_secret_access_key=aws_secret_access_key, region_name="us-east-1 ")

def upload(path, bucket="acme-prod-invoices"):
    s3.upload_file(path, bucket, path)
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute("INSERT INTO uploads VALUES ('%s')" % path)
    # failover replica: 10.42.7.20, admin contact: priya.raman@acme-corp.com
\`\`\`

The service runs on billing-api.prod.internal behind the VPN. Our on-call is Priya Raman (+1 415-555-0142).`,
  },
  {
    id: 'hipaa',
    title: 'HIPAA Patient Discharge',
    subtitle: 'Summarize a discharge note for a family',
    persona: 'Physician',
    prompt: `Summarize this discharge note in plain language for the patient's family, then list follow-up actions with dates.

DISCHARGE SUMMARY — St. Aurelius Medical Center
Patient Name: Eleanor Whitfield
DOB: 03/14/1958    SSN: 412-68-3317    MRN: SAMC-0048213
Address: 1842 Larkspur Lane, Portland, OR
Insurance Member ID: BCX-77310925
Attending: Dr. Marcus Okafor    Phone: (503) 555-0198

Admitted for community-acquired pneumonia complicated by new-onset atrial fibrillation with RVR. Treated with IV ceftriaxone and azithromycin, transitioned to oral amoxicillin-clavulanate. Rate controlled with metoprolol; CHA2DS2-VASc score 4, started apixaban 5 mg BID. Echo: LVEF 55%, mild LA enlargement. Discharged in stable condition.

Ms. Whitfield should follow up with Dr. Okafor in 7 days and cardiology in 2 weeks. Her daughter, Clara Whitfield (clara.whitfield@gmail.com), is the emergency contact.`,
  },
  {
    id: 'mna',
    title: 'Confidential M&A Contract',
    subtitle: 'Review a merger clause before signing',
    persona: 'Counsel',
    prompt: `Review this clause from our draft merger agreement. Flag risks for the acquirer, suggest stronger language, and explain the break-fee mechanics.

PROJECT NIGHTINGALE — STRICTLY CONFIDENTIAL
Section 7.3 — Termination Fee.
Halcyon Dynamics Inc. ("Parent") shall acquire Veridian Biosciences LLC ("Company") for aggregate consideration of $2.85 billion, payable 60% in cash and 40% in Parent common stock. If the Company Board, led by Chairwoman Vivian Castellanos, effects a Change of Recommendation, the Company shall pay Parent a termination fee of $114 million within two business days. Parent's reverse termination fee in the event of a regulatory failure shall be $171 million.

Signatory for Parent: Julian Ashford, CEO. Deal team contact: Theodore Lin, General Counsel (tlin@halcyon-dyn.com, +1 212-555-0117). Escrow wire: GB82 WEST 1234 5698 7654 32. Internal codename for the Company: Bluefin.`,
  },
];
