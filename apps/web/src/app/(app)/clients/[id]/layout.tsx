import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getPermissions, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { getWorkspaceContext } from '@/shared/workspace/context';
import { ClientWorkspaceNav } from '@/features/clients/components/client-workspace-nav';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionsFor } from '@/features/clients/workspace';

interface LayoutProps {
  params: Promise<{ id: string }>;
  children: ReactNode;
}

export async function generateMetadata({ params }: Omit<LayoutProps, 'children'>): Promise<Metadata> {
  const client = await getClient((await params).id);
  return { title: { default: client?.name ?? t('clients.notFound'), template: `%s · ${client?.name ?? t('app.name')}` } };
}

export default async function ClientWorkspaceLayout({ params, children }: LayoutProps) {
  await requirePermission(Permissions.CLIENTS_VIEW);
  const client = await getClient((await params).id);
  if (!client) notFound();

  return (
    <div>
      <ClientWorkspaceNav
        clientId={client.id}
        clientName={client.name}
        sections={clientSectionsFor(await getPermissions(), (await getWorkspaceContext()).module)}
      />
      {children}
    </div>
  );
}
