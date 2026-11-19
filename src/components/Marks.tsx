import type { EntityType } from '../services/types';
import { ENTITY_META } from '../services/types';

/**
 * A real value held on this device (red channel). Hover or focus shows the
 * placeholder that cleared customs in its place.
 */
export function HeldValue({ value, token, type }: { value: string; token: string; type: EntityType | null }) {
  const label = type ? ENTITY_META[type].label : 'Protected value';
  return (
    <span className="group/held relative inline">
      <span
        tabIndex={0}
        aria-label={`${label}: ${value}. Sent to the cloud as ${token}.`}
        className="cursor-help rounded-[2px] bg-red-tint px-[3px] text-red-ink shadow-[inset_0_-2px_0_var(--color-red)] outline-none transition-colors hover:bg-[#f7d3ce] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red"
      >
        {value}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-40 hidden -translate-x-1/2 whitespace-nowrap rounded-sign bg-sign px-3 py-2 font-sans text-[12px] leading-tight text-sign-ink shadow-[0_6px_18px_rgba(20,20,20,0.25)] group-hover/held:block group-focus-within/held:block"
      >
        <span className="block text-sign-ink-2">{label} · cleared as</span>
        <span className="mt-1 inline-block rounded-[2px] bg-green px-1.5 py-0.5 font-mono text-[11.5px] font-medium text-white">
          {token}
        </span>
      </span>
    </span>
  );
}

/** A placeholder token as it travels through the green channel. */
export function ClearedToken({ token }: { token: string }) {
  return (
    <span className="rounded-[2px] bg-green px-1 py-px font-medium text-white [box-decoration-break:clone]">{token}</span>
  );
}

/** A token the model emitted that the vault does not know. */
export function UnknownToken({ token }: { token: string }) {
  return (
    <span
      title="This placeholder is not in your local vault"
      className="rounded-[2px] bg-yellow-tint px-1 font-mono text-[0.88em] text-ink shadow-[inset_0_0_0_1px_var(--color-yellow)]"
    >
      {token}
    </span>
  );
}
