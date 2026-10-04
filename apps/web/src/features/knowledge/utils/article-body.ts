import { EXCERPT_LENGTH, WORDS_PER_MINUTE } from '../config';

export type ArticleBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

const BLOCK_SEPARATOR = /\n\s*\n/;

/** Blank lines separate blocks; a block with several lines renders as a checklist. */
export function parseArticleBody(body: string): ArticleBlock[] {
  return body
    .split(BLOCK_SEPARATOR)
    .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines): ArticleBlock => (lines.length === 1 ? { kind: 'paragraph', text: lines[0] ?? '' } : { kind: 'list', items: lines }));
}

export function readingMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function articleExcerpt(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= EXCERPT_LENGTH ? flat : `${flat.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}
