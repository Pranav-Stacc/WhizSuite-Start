import { notFound } from 'next/navigation';
import { Plug } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { EmptyState } from '@/shared/ui/feedback';
import { SectionHeading } from '@/shared/ui/section-heading';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { ChannelRow } from '@/features/integrations/components/channel-row';
import { listIntegrations } from '@/features/integrations/services/integrations.service';

export const metadata = { title: t('clients.workspace.integrations') };

export default async function ClientIntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ROLES_STAFF);
  const client = await getClient((await params).id);
  if (!client) notFound();
  const rows = (await listIntegrations()).filter((integration) => integration.clientId === client.id);

  return (
    <section>
      <SectionHeading number={clientSectionNumber('integrations')} title={t('clients.workspace.integrations')} />
      {rows.length === 0 ? (
        <div className="card-surface">
          <EmptyState icon={<Plug />} title={t('integrations.empty.title')} body={t('integrations.empty.body')} />
        </div>
      ) : (
        <ul className="card-surface divide-y divide-border-soft px-5">
          {rows.map((integration) => (
            <ChannelRow key={integration.id} integration={integration} clientName={client.name} />
          ))}
        </ul>
      )}
    </section>
  );
}
