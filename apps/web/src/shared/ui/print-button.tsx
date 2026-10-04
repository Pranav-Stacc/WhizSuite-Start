'use client';

import { Printer } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from './button';

/** Opens the browser print dialog; print styles hide the app chrome. */
export function PrintButton({ label }: { label?: string }) {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <Printer />
      {label ?? t('common.print')}
    </Button>
  );
}
