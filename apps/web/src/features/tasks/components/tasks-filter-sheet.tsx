'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Select } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';

const FILTERS = ['all', 'mine', 'unassigned', 'overdue'] as const;
type TaskFilter = (typeof FILTERS)[number];

interface TasksFilterSheetProps {
  filter: TaskFilter;
  clientId?: string;
  clients: Array<{ id: string; name: string }>;
}

export function TasksFilterSheet({ filter, clientId, clients }: TasksFilterSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftFilter, setDraftFilter] = useState<TaskFilter>(filter);
  const [draftClient, setDraftClient] = useState(clientId ?? '');

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (draftFilter === 'all') params.delete('f');
    else params.set('f', draftFilter);
    if (draftClient) params.set('client', draftClient);
    else params.delete('client');
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/tasks?${qs}` : '/tasks');
      setOpen(false);
    });
  };

  const activeCount = (filter !== 'all' ? 1 : 0) + (clientId ? 1 : 0);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" />
        {t('tasks.filters.sheet')}
        {activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={t('tasks.filters.sheet')} description={t('tasks.filters.sheet.desc')}>
        <div className="space-y-4">
          <Field label={t('tasks.filters.scope')} htmlFor="task-filter-scope">
            <Select id="task-filter-scope" value={draftFilter} onChange={(e) => setDraftFilter(e.target.value as TaskFilter)}>
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {t(`tasks.filter.${f}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('tasks.filter.client')} htmlFor="task-filter-client">
            <Select id="task-filter-client" value={draftClient} onChange={(e) => setDraftClient(e.target.value)}>
              <option value="">{t('tasks.filter.client')}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" variant="primary" className="w-full" disabled={pending} onClick={apply}>
            {t('tasks.filters.apply')}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
