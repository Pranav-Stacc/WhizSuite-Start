import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Plus } from 'lucide-react';
import { ArticleCategories, type ArticleCategory } from '@agency-os/contracts';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_LEADERSHIP, ROLES_STAFF } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SearchInput } from '@/shared/ui/search-input';
import { ArticleCard } from '@/features/knowledge/components/article-card';
import { ArticleDialog } from '@/features/knowledge/components/article-dialog';
import { listArticles } from '@/features/knowledge/services/knowledge.service';
import { membersById } from '@/features/team/services/members.service';

export const metadata: Metadata = { title: t('knowledge.title') };

const BASE = '/knowledge';

const GUIDE: GuideItem[] = [
  { title: t('knowledge.guide.find.title'), body: t('knowledge.guide.find.body') },
  { title: t('knowledge.guide.write.title'), body: t('knowledge.guide.write.body') },
  { title: t('knowledge.guide.format.title'), body: t('knowledge.guide.format.body') },
];

function parseCategory(value: string | undefined): ArticleCategory | undefined {
  return ArticleCategories.find((c) => c === value);
}

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_STAFF);
  const sp = await searchParams;
  const category = parseCategory(param(sp, 'f'));
  const query = (param(sp, 'q') ?? '').trim().toLowerCase();

  const [articles, members] = await Promise.all([listArticles(), membersById()]);
  const scoped = articles.filter((a) => !query || `${a.title} ${a.body}`.toLowerCase().includes(query));
  const visible = category ? scoped.filter((a) => a.category === category) : scoped;
  const canWrite = ROLES_LEADERSHIP.includes(session.role);
  const hasFilters = Boolean(category) || Boolean(query);

  return (
    <div>
      <PageHeader
        title={t('knowledge.title')}
        description={t('knowledge.description')}
        eyebrow={<BookOpen className="inline size-3.5" />}
        actions={
          <>
            <PageGuide items={GUIDE} />
            {canWrite ? (
              <ArticleDialog
                defaultOpen={param(sp, 'new') === '1'}
                trigger={
                  <Button variant="primary">
                    <Plus />
                    {t('knowledge.new')}
                  </Button>
                }
              />
            ) : null}
          </>
        }
      />

      <div role="search" aria-label={t('knowledge.filters.label')} className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput placeholder={t('knowledge.search')} className="max-w-72" />
        <FilterChips
          items={[
            { href: withQuery(BASE, sp, { new: undefined, f: undefined }), label: t('knowledge.filter.all'), active: !category, count: scoped.length },
            ...ArticleCategories.map((c) => ({
              href: withQuery(BASE, sp, { new: undefined, f: c }),
              label: t(`knowledge.category.${c}`),
              active: category === c,
              count: scoped.filter((a) => a.category === c).length,
            })),
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={<BookOpen />}
            title={t('knowledge.empty.title')}
            body={t('knowledge.empty.body')}
            action={
              hasFilters ? (
                <Button variant="secondary" asChild>
                  <Link href={BASE}>{t('common.clearFilters')}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((article) => (
            <li key={article.id}>
              <ArticleCard article={article} authorName={members.get(article.authorId)?.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
