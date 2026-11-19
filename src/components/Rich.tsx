/**
 * Dependency-free Markdown rendering that restores placeholder tokens at
 * every text leaf (code included). Only React text nodes, never raw HTML.
 */
import { Fragment, type ReactNode } from 'react';
import type { EntityType, HydratedSegment } from '../services/types';
import { HeldValue, UnknownToken } from './Marks';

export type Hydrate = (text: string) => HydratedSegment[];

function Restored({ text, hydrate }: { text: string; hydrate: Hydrate }) {
  return (
    <>
      {hydrate(text).map((s, i) =>
        s.kind === 'text' ? (
          <Fragment key={i}>{s.text}</Fragment>
        ) : s.kind === 'entity' ? (
          <HeldValue key={i} value={s.value} token={s.token} type={s.type} />
        ) : (
          <UnknownToken key={i} token={s.token} />
        ),
      )}
    </>
  );
}

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n\s][^*\n]*\*)/g;

const BR = /<br\s*\/?>/i;

function Inline({ text, hydrate }: { text: string; hydrate: Hydrate }) {
  // Models put <br> inside table cells; render them as line breaks, never as HTML.
  if (BR.test(text)) {
    return (
      <>
        {text.split(/<br\s*\/?>/gi).map((part, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            <Inline text={part} hydrate={hydrate} />
          </Fragment>
        ))}
      </>
    );
  }
  return (
    <>
      {text.split(INLINE).map((p, i) => {
        if (!p) return null;
        if (p.length > 2 && p.startsWith('`') && p.endsWith('`'))
          return (
            <code key={i} className="rounded-[2px] bg-floor px-1 py-px font-mono text-[0.84em] text-ink">
              <Restored text={p.slice(1, -1)} hydrate={hydrate} />
            </code>
          );
        if (p.length > 4 && p.startsWith('**') && p.endsWith('**'))
          return (
            <strong key={i} className="font-bold text-ink">
              <Restored text={p.slice(2, -2)} hydrate={hydrate} />
            </strong>
          );
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*'))
          return (
            <em key={i}>
              <Restored text={p.slice(1, -1)} hydrate={hydrate} />
            </em>
          );
        return <Restored key={i} text={p} hydrate={hydrate} />;
      })}
    </>
  );
}

function CodeBlock({ code, lang, hydrate }: { code: string; lang: string; hydrate: Hydrate }) {
  return (
    <figure className="my-4">
      <figcaption className="flex items-center justify-between rounded-t-sign bg-sign px-3 py-1.5 text-[12px] text-sign-ink-2">
        <span className="font-semibold text-sign-ink">{lang || 'Code'}</span>
        <span>real values restored on this device</span>
      </figcaption>
      <pre className="overflow-x-auto rounded-b-sign border border-t-0 border-line bg-white p-3.5 font-mono text-[12px] leading-[1.75] text-ink">
        <Restored text={code} hydrate={hydrate} />
      </pre>
    </figure>
  );
}

function Table({ rows, hydrate }: { rows: string[]; hydrate: Hydrate }) {
  const cells = rows
    .filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r))
    .map((r) => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()));
  const [head, ...body] = cells;
  return (
    <div className="my-4 overflow-x-auto border-y-2 border-ink">
      <table className="w-full text-left text-[14px]">
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i} className="px-3 py-2 text-[13px] font-bold">
                <Inline text={c} hydrate={hydrate} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  <Inline text={c} hydrate={hydrate} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const BLOCK_START = /^\s*(```|#{1,4}\s|[-*]\s|\d+\.\s|>|\|)/;

export function Answer({ text, hydrate }: { text: string; hydrate: Hydrate }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^\s*```(\w+)?\s*$/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(<CodeBlock key={k++} code={buf.join('\n')} lang={fence[1] ?? ''} hydrate={hydrate} />);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) buf.push(lines[i++]);
      out.push(<Table key={k++} rows={buf} hydrate={hydrate} />);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(
        <p
          key={k++}
          role="heading"
          aria-level={level + 2}
          className={level <= 2 ? 'mt-6 mb-2 text-[18px] font-extrabold tracking-[-0.01em] first:mt-0' : 'mt-5 mb-1.5 text-[15.5px] font-bold first:mt-0'}
        >
          <Inline text={h[2]} hydrate={hydrate} />
        </p>,
      );
      i++;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      const List = ordered ? 'ol' : 'ul';
      out.push(
        <List key={k++} className={`my-3 space-y-1.5 pl-5 ${ordered ? 'list-decimal marker:font-bold' : 'list-[square] marker:text-ink-3'}`}>
          {items.map((it, j) => (
            <li key={j} className="pl-1">
              <Inline text={it} hydrate={hydrate} />
            </li>
          ))}
        </List>,
      );
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(
        <blockquote key={k++} className="my-4 bg-white px-4 py-3 text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)]">
          <Inline text={buf.join(' ')} hydrate={hydrate} />
        </blockquote>,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) buf.push(lines[i++]);
    out.push(
      <p key={k++} className="my-3 first:mt-0 last:mb-0">
        <Inline text={buf.join(' ')} hydrate={hydrate} />
      </p>,
    );
  }
  return <div className="max-w-[72ch] text-[15px] leading-[1.65] text-ink-2">{out}</div>;
}

/** The user's original text with every held value marked (never leaves the device). */
export function Original({
  text,
  spans,
}: {
  text: string;
  spans: { start: number; end: number; token: string; type: EntityType }[];
}) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((s, i) => {
    if (s.start > cursor) nodes.push(text.slice(cursor, s.start));
    nodes.push(<HeldValue key={i} value={text.slice(s.start, s.end)} token={s.token} type={s.type} />);
    cursor = s.end;
  });
  nodes.push(text.slice(cursor));
  return <div className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.8] text-ink">{nodes}</div>;
}
