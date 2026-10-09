import { Permissions } from '@agency-os/contracts';
import { notFound } from 'next/navigation';
import { getPermissions, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { SectionHeading } from '@/shared/ui/section-heading';
import { BrandTab } from '@/features/clients/components/client-sections';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';

export const metadata = { title: t('clients.workspace.brand') };

export default async function ClientBrandPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permissions.CLIENTS_VIEW);
  const client = await getClient((await params).id);
  if (!client) notFound();
  const granted = await getPermissions();

  return (
    <section>
      <SectionHeading number={clientSectionNumber('brand')} title={t('clients.workspace.brand')} />
      <BrandTab client={client} canEdit={granted.has(Permissions.CLIENTS_EDIT)} />
    </section>
  );
}
