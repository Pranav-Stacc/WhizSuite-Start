'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { t } from '@/shared/i18n/t';
import { formatDate } from '@/shared/lib/format';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { greetingKey } from './dashboard-parts';

export function DashboardHeader({
  name,
  subtitle,
  actions,
  guide,
}: {
  name: string;
  subtitle: string;
  actions?: ReactNode;
  guide: GuideItem[];
}) {
  const first = name.split(' ')[0] ?? name;
  const [title, setTitle] = useState(() => t('dashboard.greeting.morning', { name: first }));
  const [eyebrow, setEyebrow] = useState('');

  useEffect(() => {
    setTitle(t(greetingKey(), { name: first }));
    setEyebrow(formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }));
  }, [first]);

  return (
    <PageHeader
      title={title}
      description={subtitle}
      eyebrow={eyebrow || '\u00a0'}
      actions={
        <>
          <PageGuide items={guide} />
          {actions}
        </>
      }
    />
  );
}
