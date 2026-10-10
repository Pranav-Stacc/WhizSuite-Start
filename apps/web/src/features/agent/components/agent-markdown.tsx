import { cn } from '@/shared/lib/cn';

/** Lightweight safe Markdown → React for agent replies (no raw HTML). */
export function AgentMarkdown({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className={cn('agent-md space-y-2.5 text-[13px] leading-relaxed', className)}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h3' : 'h4';
          return (
            <Tag
              key={i}
              className={cn(
                'font-semibold tracking-tight text-foreground',
                block.level === 1 ? 'text-[15px]' : 'text-[13px]',
              )}
            >
              <Inline text={block.text} />
            </Tag>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="space-y-1 pl-4">
              {block.items.map((item, j) => (
                <li key={j} className="list-disc text-foreground/90">
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'code') {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg border border-border-soft bg-surface-2/80 px-3 py-2 font-mono text-[11px] text-foreground/85"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        return (
          <p key={i} className="text-foreground/90">
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { type: 'heading'; level: 1 | 2; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'paragraph'; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        buf.push(lines[i] ?? '');
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }
    const heading = /^(#{1,2})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length === 1 ? 1 : 2,
        text: heading[2],
      });
      i += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() &&
      !/^(#{1,2}\s+|[-*]\s+|```)/.test(lines[i] ?? '')
    ) {
      para.push(lines[i] ?? '');
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: para.join(' ') });
  }
  return blocks.length > 0 ? blocks : [{ type: 'paragraph', text: src }];
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={idx}
              className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}
