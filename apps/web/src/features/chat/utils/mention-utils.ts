import type { ChatMentionDto, ChatMentionType } from '@agency-os/contracts';
import type { ChatMentionPayload } from '../actions/chat.actions';
import type { MentionCandidate } from '../components/send-message-form';

export const MENTION_CATEGORY_ORDER: ChatMentionType[] = [
  'AGENT',
  'USER',
  'CLIENT',
  'PROJECT',
  'CONTENT',
  'CALENDAR_EVENT',
];

/** Text before caret ends with `@` + optional filter (no spaces). */
export function mentionQueryAtCaret(text: string, caret: number): string | null {
  const before = text.slice(0, caret);
  const match = /(?:^|\s)@([^\s@]*)$/.exec(before);
  if (!match) return null;
  return match[1] ?? '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rangesOverlap(start: number, end: number, used: Array<[number, number]>): boolean {
  return used.some(([s, e]) => start < e && end > s);
}

export function extractMentions(body: string, candidates: MentionCandidate[]): ChatMentionPayload[] {
  const mentions: ChatMentionPayload[] = [];
  const used: Array<[number, number]> = [];
  const sorted = [...candidates].sort((a, b) => b.label.length - a.label.length);
  for (const candidate of sorted) {
    const pattern = new RegExp(`@${escapeRegExp(candidate.label)}(?=\\s|$|[.,!?;:])`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      const index = match.index;
      const end = index + match[0].length;
      const beforeOk = index === 0 || /\s|[([{"'`]/.test(body[index - 1] ?? '');
      if (!beforeOk || rangesOverlap(index, end, used)) continue;
      used.push([index, end]);
      mentions.push({
        type: candidate.type ?? 'USER',
        targetId: candidate.id,
        displayText: candidate.label,
        startOffset: index,
        endOffset: end,
      });
    }
  }
  return mentions.sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));
}

export type ResolvedMentionSpan = {
  key: string;
  start: number;
  end: number;
  text: string;
  type: ChatMentionType;
  targetId: string;
};

export function resolveMentionSpans(
  body: string,
  stored: ChatMentionDto[],
  candidates: MentionCandidate[],
): ResolvedMentionSpan[] {
  const fromStored = stored
    .filter((m) => m.startOffset != null && m.endOffset != null)
    .map((m) => ({
      key: m.id,
      start: m.startOffset ?? 0,
      end: m.endOffset ?? 0,
      text: body.slice(m.startOffset ?? 0, m.endOffset ?? 0) || `@${m.displayText}`,
      type: m.type,
      targetId: m.targetId,
    }));

  if (fromStored.length > 0) return fromStored.sort((a, b) => a.start - b.start);

  return extractMentions(body, candidates).map((m, index) => ({
    key: `syn-${index}-${m.targetId}`,
    start: m.startOffset ?? 0,
    end: m.endOffset ?? 0,
    text: body.slice(m.startOffset ?? 0, m.endOffset ?? 0) || `@${m.displayText}`,
    type: m.type ?? 'USER',
    targetId: m.targetId,
  }));
}

function subsequenceMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  let i = 0;
  for (let q = 0; q < needle.length; q++) {
    const ch = needle[q];
    while (i < haystack.length && haystack[i] !== ch) i += 1;
    if (i >= haystack.length) return false;
    i += 1;
  }
  return true;
}

export function filterMentionCandidates(
  candidates: MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return candidates;
  return candidates.filter((c) => {
    const label = c.label.toLowerCase();
    const sub = (c.subtitle ?? '').toLowerCase();
    return (
      label.includes(q) ||
      sub.includes(q) ||
      label.startsWith(q) ||
      subsequenceMatch(label, q) ||
      subsequenceMatch(sub, q)
    );
  });
}

export function groupMentionCandidates(
  candidates: MentionCandidate[],
  query: string,
  perCategoryWhenBrowsing: number,
): Array<{ type: ChatMentionType; items: MentionCandidate[] }> {
  const filtered = filterMentionCandidates(candidates, query);
  const byType = new Map<ChatMentionType, MentionCandidate[]>();
  for (const c of filtered) {
    const type = c.type ?? 'USER';
    const list = byType.get(type) ?? [];
    list.push(c);
    byType.set(type, list);
  }
  const limit = query.trim() ? 8 : perCategoryWhenBrowsing;
  return MENTION_CATEGORY_ORDER.filter((type) => byType.has(type)).map((type) => ({
    type,
    items: (byType.get(type) ?? []).slice(0, limit),
  }));
}
