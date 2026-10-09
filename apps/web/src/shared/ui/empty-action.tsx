import Link from 'next/link';
import { Plus } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from './button';

interface EmptyActionProps {
  /** True when the list is empty because of active filters. */
  filtered: boolean;
  clearHref: string;
  /** Opens the create flow; omitted when the viewer cannot create. */
  createHref?: string;
  createLabel?: string;
}

/** Next step for an empty list: clear filters, or create the first item. */
export function EmptyAction({ filtered, clearHref, createHref, createLabel }: EmptyActionProps) {
  if (filtered) {
    return (
      <Button variant="secondary" asChild>
        <Link href={clearHref}>{t('common.clearFilters')}</Link>
      </Button>
    );
  }
  if (!createHref || !createLabel) return null;
  return (
    <Button variant="primary" asChild>
      <Link href={createHref}>
        <Plus />
        {createLabel}
      </Link>
    </Button>
  );
}
