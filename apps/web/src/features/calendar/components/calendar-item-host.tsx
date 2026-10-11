'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { CalendarItem } from '../services/calendar.service';
import { CalendarItemDialog } from './calendar-item-dialog';

interface CalendarItemHostProps {
  items: CalendarItem[];
  itemId?: string;
}

export function CalendarItemHost({ items, itemId }: CalendarItemHostProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const item = itemId ? items.find((row) => row.id === itemId || row.storedId === itemId) : undefined;

  const close = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('item');
    const qs = params.toString();
    router.replace(qs ? `/calendar?${qs}` : '/calendar', { scroll: false });
  };

  return <CalendarItemDialog item={item ?? null} onOpenChange={(open) => !open && close()} />;
}
