import type { ReactNode } from 'react';
import Link from 'next/link';
import type { ContentStatus } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { MediaThumb } from '@/shared/ui/media-thumb';
import { StatusBadge } from '@/shared/ui/status';
import type { ContentEvent, Post } from '../../data/content.repository';
import { ActivityTimeline } from '../activity-timeline';

export type QueueGroupKey = 'review' | 'changes' | 'ready' | 'drafts' | 'live';

export const QUEUE_GROUP_STATUSES: Record<QueueGroupKey, ContentStatus[]> = {
  review: ['IN_REVIEW'],
  changes: ['CHANGES_REQUESTED'],
  ready: ['APPROVED', 'SCHEDULED'],
  drafts: ['DRAFT'],
  live: ['PUBLISHED'],
};

export const AGENCY_QUEUE_GROUPS: QueueGroupKey[] = ['review', 'changes', 'ready', 'drafts'];
export const PORTAL_QUEUE_GROUPS: QueueGroupKey[] = ['review', 'changes', 'ready', 'live'];

const byDate = (a: Post, b: Post) => (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt);

/** The post selected when none is requested: the first entry of the first non-empty group, as listed. */
export function defaultQueuePost(groups: QueueGroupKey[], posts: Post[]): Post | undefined {
  for (const group of groups) {
    const [first] = posts.filter((p) => QUEUE_GROUP_STATUSES[group].includes(p.status)).sort(byDate);
    if (first) return first;
  }
  return undefined;
}

interface ApprovalQueueProps {
  groups: QueueGroupKey[];
  posts: Post[];
  selectedId?: string;
  /** Link that selects each post (keeps the rest of the page state). */
  hrefs: Record<string, string>;
  /** The selected post's panel. */
  children?: ReactNode;
  aside?: ReactNode;
}

/** Three-pane review desk: grouped queue · selected post with its conversation · feed preview. */
export function ApprovalQueue({ groups, posts, selectedId, hrefs, children, aside }: ApprovalQueueProps) {
  return (
    <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <nav aria-label={t('queue.title')} className="space-y-8">
        {groups.map((group) => {
          const items = posts.filter((p) => QUEUE_GROUP_STATUSES[group].includes(p.status)).sort(byDate);
          return (
            <section key={group} aria-labelledby={`queue-${group}`}>
              <h3 id={`queue-${group}`} className="eyebrow mb-3 flex items-center justify-between border-b border-border pb-2">
                {t(`queue.group.${group}`)}
                <span className="tabular-nums">{items.length}</span>
              </h3>
              {items.length ? (
                <ul className="space-y-1">
                  {items.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={hrefs[post.id]}
                        scroll={false}
                        aria-current={post.id === selectedId ? 'true' : undefined}
                        className={cn(
                          'flex items-center gap-3 border-l-2 py-1.5 pl-2.5 pr-1 transition-colors',
                          post.id === selectedId ? 'border-foreground bg-surface' : 'border-transparent hover:bg-surface',
                        )}
                      >
                        <span className="aspect-[4/5] w-9 shrink-0 overflow-hidden border border-border-soft">
                          <MediaThumb url={post.media[0]?.url} mimeType={post.media[0]?.mimeType} alt="" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px]">{post.title}</span>
                          <span className="block text-[10.5px] uppercase tracking-[0.12em] text-muted">
                            {post.scheduledAt ? formatDate(post.scheduledAt, { weekday: 'short', day: 'numeric', month: 'short' }) : t('sheet.unscheduled')}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-muted">{t('queue.group.empty')}</p>
              )}
            </section>
          );
        })}
      </nav>

      <div className="min-w-0">{children ?? <p className="border border-border bg-surface px-6 py-16 text-center text-[13px] text-muted">{t('queue.pick')}</p>}</div>

      {aside ? <aside className="hidden xl:block">{aside}</aside> : null}
    </div>
  );
}

interface QueuePostPanelProps {
  post: Post;
  thread: ContentEvent[];
  /** Workflow buttons available to the viewer. */
  actions: ReactNode;
  /** Message form for the conversation. */
  composer: ReactNode;
  /** Extra header control, e.g. "Edit" for staff. */
  headerAction?: ReactNode;
}

export function QueuePostPanel({ post, thread, actions, composer, headerAction }: QueuePostPanelProps) {
  return (
    <article className="border border-border bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border-soft px-6 py-5">
        <div className="min-w-0">
          <p className="eyebrow">
            {t(`type.content.${post.contentType}`)}
            {post.scheduledAt ? ` · ${formatDateTime(post.scheduledAt)}` : ''}
          </p>
          <h2 className="display mt-2 text-[24px]">{post.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge kind="content" value={post.status} />
          {headerAction}
        </div>
      </header>

      {post.media.length ? (
        <ol className="flex gap-2 overflow-x-auto border-b border-border-soft px-6 py-5">
          {post.media.map((m, index) => (
            <li key={m.assetId} className="aspect-[4/5] w-44 shrink-0 overflow-hidden border border-border-soft">
              <MediaThumb url={m.url} mimeType={m.mimeType} alt={t('queue.slide', { n: index + 1, total: post.media.length })} />
            </li>
          ))}
        </ol>
      ) : null}

      <div className="grid gap-px bg-border-soft md:grid-cols-2">
        <section aria-labelledby="queue-caption" className="space-y-4 bg-surface px-6 py-5">
          <h3 id="queue-caption" className="eyebrow">
            {t('sheet.row.caption')}
          </h3>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{post.caption || '—'}</p>
          {post.hashtags.length ? <p className="text-[13px] text-muted">{post.hashtags.join(' ')}</p> : null}
          {post.ctaUrl ? (
            <p className="text-[12px]">
              <span className="eyebrow mr-2">{t('sheet.row.cta')}</span>
              <a href={post.ctaUrl} target="_blank" rel="noreferrer noopener" className="break-all underline-offset-4 hover:underline">
                {post.ctaUrl}
              </a>
            </p>
          ) : null}
        </section>
        <section aria-labelledby="queue-thread" className="space-y-5 bg-surface px-6 py-5">
          <h3 id="queue-thread" className="eyebrow">
            {t('queue.conversation')}
          </h3>
          <ActivityTimeline events={thread} />
          {composer}
        </section>
      </div>

      <footer className="border-t border-border-soft px-6 py-4">{actions}</footer>
    </article>
  );
}
