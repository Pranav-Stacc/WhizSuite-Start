'use client';

import { Lightbulb } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from './button';
import { Kbd } from './feedback';
import { Popover } from './overlays';

export interface GuideItem {
  title: string;
  body: string;
  shortcut?: string;
}

/**
 * Answers "what can I do here, and how?" on every page. Always one click away,
 * never blocking. Content comes from the page so guidance stays specific.
 */
export function PageGuide({ items }: { items: GuideItem[] }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="sm" className="text-muted">
          <Lightbulb className="text-warning" />
          <span className="hidden sm:inline">{t('common.whatCanIDo')}</span>
        </Button>
      </Popover.Trigger>
      <Popover.Content className="w-[min(92vw,360px)]">
        <div className="border-b border-border-soft px-4 py-3 text-sm font-semibold">{t('common.whatCanIDo')}</div>
        <ul className="max-h-80 divide-y divide-border-soft overflow-y-auto">
          {items.map((item) => (
            <li key={item.title} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{item.title}</p>
                {item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </Popover.Content>
    </Popover.Root>
  );
}
