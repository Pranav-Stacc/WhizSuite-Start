import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { Avatar, LogoTile } from '@/shared/ui/avatar';
import { Card } from '@/shared/ui/card';
import { PlatformStack } from '@/shared/ui/platform';
import { StatusBadge } from '@/shared/ui/status';
import type { Client } from '../data/clients.repository';
import { HealthPill } from './health-pill';

export function ClientCard({ client, ownerName }: { client: Client; ownerName?: string }) {
  return (
    <Card hover className="relative flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <LogoTile name={client.name} color={client.color} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">
            <Link href={`/clients/${client.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary">
              {client.name}
            </Link>
          </h2>
          <p className="truncate text-xs text-muted">{client.industry || client.website}</p>
        </div>
        <StatusBadge kind="client" value={client.status} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">{t('clients.col.retainer')}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{formatMoney(client.retainerMinor, undefined, true)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t('clients.col.health')}</dt>
          <dd className="mt-0.5">
            <HealthPill score={client.health} showLabel />
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex items-center justify-between">
        {client.platforms.length ? <PlatformStack platforms={client.platforms} /> : <span className="text-xs text-muted">{t('clients.channels.empty')}</span>}
        {ownerName ? <Avatar name={ownerName} size="xs" /> : null}
      </div>
    </Card>
  );
}
