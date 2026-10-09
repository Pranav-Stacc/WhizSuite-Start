import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/format';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';

export function greetingKey(date: Date = new Date()): MessageKey {
  const hour = date.getHours();
  if (hour < 12) return 'dashboard.greeting.morning';
  if (hour < 18) return 'dashboard.greeting.afternoon';
  return 'dashboard.greeting.evening';
}

export function DashboardHeader({ name, subtitle, actions, guide }: { name: string; subtitle: string; actions?: ReactNode; guide: GuideItem[] }) {
  const first = name.split(' ')[0] ?? name;
  return (
    <PageHeader
      title={t(greetingKey(), { name: first })}
      description={subtitle}
      eyebrow={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
      actions={
        <>
          <PageGuide items={guide} />
          {actions}
        </>
      }
    />
  );
}

interface ListCardProps {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  empty?: string;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Card with a header link and either rows or a friendly empty message. */
export function ListCard({ title, description, href, hrefLabel, empty, children, className, bodyClassName }: ListCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={title}
        description={description}
        action={
          href ? (
            <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              {hrefLabel ?? t('common.viewAll')}
              <ArrowRight className="size-3" />
            </Link>
          ) : undefined
        }
      />
      <CardBody className={cn('flex-1 pt-3', bodyClassName)}>
        {children ?? <p className="py-6 text-center text-sm text-muted">{empty}</p>}
      </CardBody>
    </Card>
  );
}

export function RowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2', className)}>
      {children}
    </Link>
  );
}
