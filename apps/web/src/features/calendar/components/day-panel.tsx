'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Plus } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Sheet } from '@/shared/ui/overlays';
import type { CalendarItem, CalendarKind } from '../services/calendar.service';
import { CreateEventDialog } from './create-event-dialog';
import { PlanShootDialog } from './plan-shoot-dialog';

function kindLabel(kind: CalendarKind): string {
  switch (kind) {
    case 'content':
      return t('calendar.legend.content');
    case 'task':
      return t('calendar.legend.tasks');
    case 'shoot':
      return t('calendar.legend.shoots');
    case 'approval':
      return t('calendar.legend.approvals');
    case 'campaign':
      return t('calendar.legend.campaigns');
    case 'invoice':
      return t('calendar.legend.invoices');
    case 'milestone':
      return t('calendar.legend.milestones');
    case 'meeting':
      return t('calendar.legend.meetings');
    case 'deadline':
      return t('calendar.legend.deadlines');
    default:
      return t('calendar.legend.manual');
  }
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface DayPanelProps {
  day: string;
  items: CalendarItem[];
  closeHref: string;
  clientId?: string;
  canCreate: boolean;
  canPlanShoot: boolean;
  googleConnected: boolean;
  defaultSyncToGoogle: boolean;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; clientId: string }>;
}

export function DayPanel({
  day,
  items,
  closeHref,
  clientId,
  canCreate,
  canPlanShoot,
  googleConnected,
  defaultSyncToGoogle,
  clients,
  projects,
}: DayPanelProps) {
  const router = useRouter();
  const dayStartLocal = `${day}T09:00`;
  const contentHref = clientId
    ? `/content?new=1&client=${clientId}&scheduledAt=${encodeURIComponent(`${day}T09:00:00`)}`
    : `/content?new=1&scheduledAt=${encodeURIComponent(`${day}T09:00:00`)}`;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref);
      }}
      title={formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
      description={t('calendar.day.count', { count: items.length })}
      width="max-w-md"
    >
      <div className="space-y-5">
        {(canCreate || canPlanShoot) && (
          <div className="flex flex-wrap gap-2">
            {canCreate ? (
              <>
                <Button variant="primary" size="sm" asChild>
                  <Link href={contentHref}>
                    <Plus className="size-3.5" />
                    {t('content.new')}
                  </Link>
                </Button>
                <CreateEventDialog
                  defaultStartsAt={dayStartLocal}
                  defaultClientId={clientId}
                  clients={clients}
                  googleConnected={googleConnected}
                  defaultSyncToGoogle={defaultSyncToGoogle}
                  trigger={
                    <Button variant="secondary" size="sm">
                      <Plus className="size-3.5" />
                      {t('calendar.event.open')}
                    </Button>
                  }
                />
              </>
            ) : null}
            {canPlanShoot ? (
              <PlanShootDialog
                clients={clients}
                projects={projects}
                defaultClientId={clientId}
                defaultStartsAt={dayStartLocal}
                googleConnected={googleConnected}
                defaultSyncToGoogle={defaultSyncToGoogle}
                trigger={
                  <Button variant="secondary" size="sm">
                    <Camera className="size-3.5" />
                    {t('calendar.shoot.open')}
                  </Button>
                }
              />
            ) : null}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted">{t('calendar.day.empty')}</p>
        ) : (
          <ul className="divide-y divide-border-soft border border-border">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}-${item.at}`}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ background: item.clientColor || 'var(--border)' }}
                  />
                  <span className="w-14 shrink-0 text-xs tabular-nums text-muted">{timeOf(item.at)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted">{kindLabel(item.kind)}</span>
                  </span>
                  {item.syncToGoogle ? (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
                      {t('calendar.sync.badge')}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
