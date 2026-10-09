import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Pencil } from 'lucide-react';
import { can, loadIf, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { formatDate } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { PrintButton } from '@/shared/ui/print-button';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { ArticleDialog } from '@/features/knowledge/components/article-dialog';
import { CATEGORY_META } from '@/features/knowledge/config';
import { getArticle } from '@/features/knowledge/services/knowledge.service';
import { parseArticleBody, readingMinutes } from '@/features/knowledge/utils/article-body';
import { memberName } from '@/features/team/services/members.service';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: Pick<PageProps, 'params'>): Promise<Metadata> {
  const article = await getArticle((await params).id);
  return { title: article?.title ?? t('knowledge.notFound') };
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  await requirePermission(Permissions.ORG_VIEW);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const article = await getArticle(id);
  if (!article) notFound();

  const author = await loadIf(Permissions.MEMBERS_VIEW, () => memberName(article.authorId), undefined);
  const canWrite = await can(Permissions.ORG_SETTINGS_MANAGE);
  const { icon: Icon, tone } = CATEGORY_META[article.category];
  const blocks = parseArticleBody(article.body);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/knowledge">
            <ArrowLeft />
            {t('knowledge.back')}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <PrintButton />
          {canWrite ? (
            <Button variant="secondary" asChild>
              <Link href={`/knowledge/${article.id}?edit=1`}>
                <Pencil />
                {t('common.edit')}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <article className="card-surface print-sheet p-6 sm:p-10">
        <header className="mb-6 border-b border-border pb-6">
          <div className="mb-3 flex items-center gap-3">
            <Badge tone={tone}>
              <Icon className="size-3.5" />
              {t(`knowledge.category.${article.category}`)}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock className="size-3.5" />
              {t('knowledge.readTime', { minutes: readingMinutes(article.body) })}
            </span>
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{article.title}</h1>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            {author ? <Avatar name={author} size="xs" /> : null}
            {t('knowledge.updatedBy', { name: author ?? t('common.none'), date: formatDate(article.updatedAt) })}
          </p>
        </header>

        <div className="space-y-5 text-[15px] leading-relaxed">
          {blocks.map((block, index) =>
            block.kind === 'paragraph' ? (
              <p key={index} className={index === 0 ? 'text-base text-foreground' : 'text-muted'}>
                {block.text}
              </p>
            ) : (
              <ol key={index} className="space-y-2.5">
                {block.items.map((item, step) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/14 text-xs font-semibold text-primary">{step + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            ),
          )}
        </div>
      </article>

      {canWrite && param(sp, 'edit') === '1' ? <ArticleDialog article={article} defaultOpen /> : null}
    </div>
  );
}
