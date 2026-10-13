import { Permissions } from '@agency-os/contracts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getPermissions, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { SectionHeading } from '@/shared/ui/section-heading';
import { ClientContactsPanel } from '@/features/clients/components/client-contacts-panel';
import { listClientContacts } from '@/features/clients/services/client-contacts.service';
import { getClient } from '@/features/clients/services/clients.service';

export const metadata = { title: t('clients.contacts.title') };

export default async function ClientContactsPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permissions.CLIENTS_VIEW);
  const client = await getClient((await params).id);
  if (!client) notFound();

  const granted = await getPermissions();
  const canEdit = granted.has(Permissions.CLIENTS_EDIT);
  const contacts = await listClientContacts(client.id).catch(() => []);

  return (
    <section className="space-y-6">
      <SectionHeading title={t('clients.contacts.title')} />
      <p className="text-sm text-muted">{t('clients.contacts.pageDesc')}</p>
      {canEdit ? (
        <ClientContactsPanel clientId={client.id} contacts={contacts} />
      ) : (
        <ul className="space-y-2">
          {contacts.length === 0 ? (
            <li className="text-sm text-muted">{t('clients.contacts.empty')}</li>
          ) : (
            contacts.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/clients/${client.id}/contacts/${row.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border-soft px-3 py-2 text-sm transition hover:border-primary/30 hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{row.label}</p>
                    {row.role ? <p className="text-muted">{row.role}</p> : null}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
