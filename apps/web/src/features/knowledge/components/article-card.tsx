import Link from 'next/link';
import { Clock } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { relativeTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { CATEGORY_META } from '../config';
import type { Article } from '../data/knowledge.repository';
import { articleExcerpt, readingMinutes } from '../utils/article-body';

interface ArticleCardProps {
  article: Article;
  authorName?: string;
}

export function ArticleCard({ article, authorName }: ArticleCardProps) {
  const { icon: Icon, tone } = CATEGORY_META[article.category];
  return (
    <Link
      href={`/knowledge/${article.id}`}
      className="card-surface group flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge tone={tone}>
          <Icon className="size-3.5" />
          {t(`knowledge.category.${article.category}`)}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted">
          <Clock className="size-3.5" />
          {t('knowledge.readTime', { minutes: readingMinutes(article.body) })}
        </span>
      </div>
      <h3 className="text-base font-semibold leading-snug group-hover:text-primary">{article.title}</h3>
      <p className="line-clamp-3 text-[13px] leading-relaxed text-muted">{articleExcerpt(article.body)}</p>
      <p className="mt-auto pt-1 text-xs text-muted">
        {authorName ? t('knowledge.byAuthor', { name: authorName, when: relativeTime(article.updatedAt) }) : relativeTime(article.updatedAt)}
      </p>
    </Link>
  );
}
