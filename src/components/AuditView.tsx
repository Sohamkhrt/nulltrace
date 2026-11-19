import type { AuditEvent, NullTraceState } from '../hooks/useNullTrace';

const ACTION: Record<AuditEvent['action'], { label: string; cls: string }> = {
  REDACT: { label: 'Held', cls: 'bg-red-tint text-red-ink' },
  EGRESS: { label: 'Sent', cls: 'bg-green-tint text-green-ink' },
  BLOCKED: { label: 'Blocked', cls: 'bg-red text-white' },
  WIPE: { label: 'Wiped', cls: 'bg-sign text-sign-ink' },
  POLICY: { label: 'Policy', cls: 'bg-yellow-tint text-ink' },
};

export function AuditView({ s }: { s: NullTraceState }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[980px] px-6 py-8">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.025em]">Audit log</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] text-ink-2">
          What happened in this session, newest first. It records counts and categories, never the values themselves, and it stays
          on this device.
        </p>

        {!s.policy.enableAuditLog ? (
          <p className="mt-8 rounded-sign bg-white px-4 py-4 text-[14px] shadow-[inset_0_0_0_1px_var(--color-line)]">
            Your security policy has turned the audit log off (Remote Config <code className="font-mono text-[12px]">enable_audit_log</code>).
          </p>
        ) : s.audit.length === 0 ? (
          <p className="mt-8 text-[15px] text-ink-3">No events yet. Send a message from the workspace.</p>
        ) : (
          <table className="mt-6 w-full text-left text-[14px]">
            <thead>
              <tr className="border-b-2 border-ink text-[13px]">
                <th scope="col" className="py-2 pr-4 font-bold">Time</th>
                <th scope="col" className="py-2 pr-4 font-bold">Event</th>
                <th scope="col" className="py-2 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {s.audit.map((a) => (
                <tr key={a.id} className="border-b border-line align-top">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink-3">{new Date(a.ts).toLocaleTimeString()}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded-[2px] px-1.5 py-0.5 text-[12.5px] font-bold ${ACTION[a.action].cls}`}>{ACTION[a.action].label}</span>
                  </td>
                  <td className="py-2.5 text-ink-2">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
