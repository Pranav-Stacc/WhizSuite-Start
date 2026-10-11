import { Fragment, type ReactNode } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** Lightweight safe Markdown → React for agent replies (no raw HTML). */
export function AgentMarkdown({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className={cn('agent-md space-y-2.5 text-[13px] leading-relaxed', className)}>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; ordered: boolean; start: number; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'quote'; lines: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'rule' }
  | { type: 'image'; alt: string; src: string }
  | { type: 'paragraph'; lines: string[] };

const HEADING = /^(#{1,6})\s+(.+)$/;
const BULLET = /^\s*[-*+•]\s+(.*)$/;
const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const BLOCK_START = /^(#{1,6}\s+|\s*[-*+•]\s+|\s*\d+[.)]\s+|>|```|\s*\|)/;
const IMAGE_MD = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const BARE_IMAGE_URL =
  /^https?:\/\/[^\s]+\.(png|jpe?g|gif|webp|avif|svg)(\?[^\s]*)?\s*$/i;
const SAFE_HREF = /^(https?:\/\/|\/|mailto:)/i;

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  const at = (idx: number) => lines[idx] ?? '';

  while (i < lines.length) {
    const line = at(i);
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.trimStart().startsWith('```')) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !at(i).trimStart().startsWith('```')) {
        buf.push(at(i));
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      i += 1;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }
    const imageMd = IMAGE_MD.exec(line.trim());
    if (imageMd && SAFE_HREF.test(imageMd[2])) {
      blocks.push({ type: 'image', alt: imageMd[1], src: imageMd[2] });
      i += 1;
      continue;
    }
    if (BARE_IMAGE_URL.test(line.trim())) {
      blocks.push({ type: 'image', alt: '', src: line.trim() });
      i += 1;
      continue;
    }
    if (TABLE_ROW.test(line) && TABLE_DIVIDER.test(at(i + 1))) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(at(i))) {
        rows.push(splitRow(at(i)));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(at(i))) {
        quoted.push(QUOTE.exec(at(i))?.[1] ?? '');
        i += 1;
      }
      blocks.push({ type: 'quote', lines: quoted });
      continue;
    }
    const ordered = ORDERED.exec(line);
    if (ordered || BULLET.test(line)) {
      const pattern = ordered ? ORDERED : BULLET;
      const items: string[] = [];
      while (i < lines.length) {
        const current = at(i);
        const match = pattern.exec(current);
        if (match) {
          items.push((ordered ? match[2] : match[1]) ?? '');
          i += 1;
        } else if (current.trim() && /^\s{2,}/.test(current) && items.length > 0) {
          items[items.length - 1] += ` ${current.trim()}`;
          i += 1;
        } else {
          break;
        }
      }
      blocks.push({
        type: 'list',
        ordered: Boolean(ordered),
        start: ordered ? Number(ordered[1]) : 1,
        items,
      });
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (i < lines.length && at(i).trim() && !BLOCK_START.test(at(i)) && !RULE.test(at(i))) {
      para.push(at(i));
      i += 1;
    }
    blocks.push({ type: 'paragraph', lines: para });
  }
  return blocks;
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const Tag = block.level <= 2 ? 'h3' : 'h4';
      return (
        <Tag
          className={cn(
            'font-semibold tracking-tight text-foreground',
            block.level <= 1 ? 'text-[15px]' : block.level === 2 ? 'text-[14px]' : 'text-[13px]',
            'pt-1',
          )}
        >
          <Inline text={block.text} />
        </Tag>
      );
    }
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag
          start={block.ordered ? block.start : undefined}
          className={cn('space-y-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}
        >
          {block.items.map((item, j) => (
            <li key={j} className="pl-0.5 text-foreground/90 marker:text-muted">
              <Inline text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-lg border border-border-soft bg-surface-2/80 px-3 py-2 font-mono text-[11px] text-foreground/85">
          <code>{block.text}</code>
        </pre>
      );
    case 'quote':
      return (
        <blockquote className="border-l-2 border-sky-500/40 pl-3 text-foreground/80">
          <Lines lines={block.lines} />
        </blockquote>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-border-soft/70">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead className="bg-surface-2/70">
              <tr>
                {block.header.map((cell, j) => (
                  <th key={j} className="px-2.5 py-1.5 font-semibold text-foreground">
                    <Inline text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-border-soft/60">
                  {row.map((cell, c) => (
                    <td key={c} className="px-2.5 py-1.5 align-top text-foreground/90">
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'rule':
      return <hr className="border-border-soft/70" />;
    case 'image':
      return <MarkdownImage alt={block.alt} src={block.src} />;
    case 'paragraph':
      return (
        <p className="text-foreground/90">
          <Lines lines={block.lines} />
        </p>
      );
  }
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, idx) => (
        <Fragment key={idx}>
          {idx > 0 ? <br /> : null}
          <Inline text={line} />
        </Fragment>
      ))}
    </>
  );
}

const INLINE =
  /(\*\*[^*]+\*\*|`[^`]+`|!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;

function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE).filter(Boolean);
  return <>{parts.map((part, idx) => renderInline(part, idx))}</>;
}

function renderInline(part: string, key: number): ReactNode {
  if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
    return (
      <strong key={key} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    );
  }
  if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
    return (
      <code key={key} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px]">
        {part.slice(1, -1)}
      </code>
    );
  }
  const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(part);
  if (image) {
    const src = image[2] ?? '';
    if (!SAFE_HREF.test(src)) return <span key={key}>{part}</span>;
    return <MarkdownImage key={key} alt={image[1] ?? ''} src={src} inline />;
  }
  const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
  if (link) {
    const href = link[2] ?? '';
    const label = link[1] ?? '';
    if (!SAFE_HREF.test(href)) return <span key={key}>{label}</span>;
    if (isPdfLink(href, label)) {
      return <PdfLinkCard key={key} name={label} href={href} />;
    }
    const external = /^https?:\/\//i.test(href);
    return (
      <a
        key={key}
        href={href}
        className="text-sky-300 underline underline-offset-2 hover:text-sky-200"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {label}
      </a>
    );
  }
  if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
    return (
      <em key={key} className="italic">
        {part.slice(1, -1)}
      </em>
    );
  }
  return <span key={key}>{part}</span>;
}

function isPdfLink(href: string, label: string): boolean {
  return /\.pdf(\?|#|$)/i.test(href) || /\.pdf$/i.test(label);
}

function MarkdownImage({
  alt,
  src,
  inline,
}: {
  alt: string;
  src: string;
  inline?: boolean;
}) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('block max-w-full', inline ? 'my-1' : 'my-2')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- agent content may be any signed URL */}
      <img
        src={src}
        alt={alt || 'Image'}
        loading="lazy"
        className="max-h-72 w-auto max-w-full rounded-xl border border-border-soft/80 bg-surface-2/50 object-contain shadow-sm"
      />
    </a>
  );
}

function PdfLinkCard({ name, href }: { name: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="my-1 flex max-w-sm items-center gap-3 rounded-xl border border-border-soft/80 bg-surface-2/60 px-3 py-2.5 transition hover:border-sky-500/40 hover:bg-surface-2"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-300">
        <FileText className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
        <span className="text-[11px] text-muted">PDF</span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-muted" />
    </a>
  );
}
