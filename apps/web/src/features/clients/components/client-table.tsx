import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { Avatar, LogoTile } from '@/shared/ui/avatar';
import { PlatformStack } from '@/shared/ui/platform';
import { MobileDataCard, MobileDataHeader, MobileDataRow, ResponsiveDataView } from '@/shared/ui/responsive-data';
import { StatusBadge } from '@/shared/ui/status';
import type { Client } from '../data/clients.repository';
import { HealthPill } from './health-pill';

export function ClientTable({ clients, ownerName }: { clients: Client[]; ownerName: (memberId: string) => string | undefined }) {
  const table = (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">{t('clients.col.client')}</th>
            <th className="px-4 py-3 font-medium">{t('clients.col.status')}</th>
            <th className="px-4 py-3 font-medium">{t('clients.col.health')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('clients.col.retainer')}</th>
            <th className="px-4 py-3 font-medium">{t('clients.col.channels')}</th>
            <th className="px-4 py-3 font-medium">{t('clients.col.owner')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {clients.map((client) => {
            const owner = ownerName(client.ownerId);
            return (
              <tr key={client.id} className="transition-colors hover:bg-surface-2">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="flex items-center gap-3 font-medium hover:text-primary">
                    <LogoTile name={client.name} color={client.color} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate">{client.name}</span>
                      <span className="block truncate text-xs font-normal text-muted">{client.industry}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge kind="client" value={client.status} />
                </td>
                <td className="px-4 py-3">
                  <HealthPill score={client.health} showLabel />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(client.retainerMinor)}</td>
                <td className="px-4 py-3">
                  <PlatformStack platforms={client.platforms} size="xs" />
                </td>
                <td className="px-4 py-3">
                  {owner ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={owner} size="xs" />
                      {owner}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const cards = clients.map((client) => {
    const owner = ownerName(client.ownerId);
    return (
      <MobileDataCard key={client.id} href={`/clients/${client.id}`}>
        <MobileDataHeader
          title={
            <span className="inline-flex items-center gap-2">
              <LogoTile name={client.name} color={client.color} size="sm" />
              {client.name}
            </span>
          }
          subtitle={client.industry}
          trailing={<StatusBadge kind="client" value={client.status} />}
        />
        <MobileDataRow label={t('clients.col.health')}>
          <HealthPill score={client.health} showLabel />
        </MobileDataRow>
        <MobileDataRow label={t('clients.col.retainer')}>{formatMoney(client.retainerMinor)}</MobileDataRow>
        <MobileDataRow label={t('clients.col.channels')}>
          <PlatformStack platforms={client.platforms} size="xs" />
        </MobileDataRow>
        {owner ? (
          <MobileDataRow label={t('clients.col.owner')}>
            <span className="inline-flex items-center gap-2">
              <Avatar name={owner} size="xs" />
              {owner}
            </span>
          </MobileDataRow>
        ) : null}
      </MobileDataCard>
    );
  });

  return <ResponsiveDataView table={table} cards={cards} />;
}
