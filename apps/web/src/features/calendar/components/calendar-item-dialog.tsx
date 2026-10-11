'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CalendarItem } from '../services/calendar.service';
import { t } from '@/shared/i18n/t';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Modal } from '@/shared/ui/overlays';

interface CalendarItemDialogProps {
  item: CalendarItem | null;
  onOpenChange: (open: boolean) => void;
}

export function CalendarItemDialog({ item, onOpenChange }: CalendarItemDialogProps) {
  const [open, setOpen] = useState(Boolean(item));

  useEffect(() => {
    setOpen(Boolean(item));
  }, [item]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={item.title}
      description={formatDateTime(item.at)}
      size="sm"
      footer={
        <Button variant="primary" size="sm" asChild>
          <Link href={item.href}>{t('calendar.item.open')}</Link>
        </Button>
      }
    >
      <p className="text-[13px] text-muted">{item.kind.replace(/_/g, ' ')}</p>
    </Modal>
  );
}
