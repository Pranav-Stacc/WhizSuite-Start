import { Permissions } from '@agency-os/contracts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { can, getPermissions, loadIf, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { ContactDetailForm } from '@/features/clients/components/contact-detail-form';
import { ContactPortalAccessPanel } from '@/features/clients/components/contact-portal-access-panel';
import { listClientContacts } from '@/features/clients/services/client-contacts.service';
import { getClient } from '@/features/clients/services/clients.service';
import { isOwnerRole } from '@/features/roles/config';
import { listPermissionCatalog } from '@/features/roles/services/permissions.service';
import { listRoles, toRoleSummary } from '@/features/roles/services/roles.service';
import { PortalInviteDialog } from '@/features/team/components/portal-invite-dialog';
import { PERSONAL_ACCESS_PREFIX } from '@/features/team/config';
import { loadScopeResources } from '@/features/team/services/scope-resources.service';
import { findPortalMemberByEmail, getMemberAccess } from '@/features/team/services/members.service';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  const { id, contactId } = await params;
  const contact = (await listClientContacts(id).catch(() => [])).find((row) => row.id === contactId);
  return { title: contact?.label ?? t('clients.contacts.title') };
}

export default async function ClientContactDetailPage({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  await requirePermission(Permissions.CLIENTS_VIEW);
  const { id, contactId } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const contacts = await listClientContacts(client.id).catch(() => []);
  const contact = contacts.find((row) => row.id === contactId);
  if (!contact) notFound();

  const granted = await getPermissions();
  const canEdit = granted.has(Permissions.CLIENTS_EDIT);
  const canInvite = granted.has(Permissions.MEMBERS_INVITE);
  const manageRoles = await can(Permissions.ROLES_MANAGE);

  const portalMember = contact.email ? await findPortalMemberByEmail(contact.email) : null;
  const [roles, catalog, memberAccess, scopeResources] = await Promise.all([
    loadIf(Permissions.ROLES_MANAGE, listRoles, []),
    loadIf(Permissions.ROLES_MANAGE, listPermissionCatalog, []),
    portalMember && manageRoles
      ? getMemberAccess(portalMember.id).catch(() => null)
      : Promise.resolve(null),
    manageRoles ? loadScopeResources().catch(() => null) : Promise.resolve(null),
  ]);

  const assignableRoles = manageRoles ? roles.map(toRoleSummary).filter((role) => !isOwnerRole(role)) : [];
  const roleDetails = portalMember
    ? roles.filter((role) => portalMember.roles.some((assigned) => assigned.id === role.id))
    : [];
  const personalRole = roleDetails.find(
    (role) => !role.isSystem && role.name.startsWith(PERSONAL_ACCESS_PREFIX),
  );
  const roleGrantedKeys = roleDetails
    .filter((role) => role.id !== personalRole?.id)
    .flatMap((role) => role.permissionKeys);
  const canEditAccess = Boolean(portalMember && manageRoles && portalMember.status === 'ACTIVE');

  return (
    <div className="space-y-8">
      <nav aria-label={t('clients.workspace.breadcrumb')} className="flex items-center gap-2 text-[12px] text-muted">
        <Link href={`/clients/${client.id}/contacts`} className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          {t('clients.contacts.title')}
        </Link>
      </nav>

      <header className="space-y-1">
        <h1 className="display text-[28px] sm:text-[32px]">{contact.label}</h1>
        {contact.role ? <p className="text-sm text-muted">{contact.role}</p> : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t('clients.contacts.profile')} />
          <CardBody>
            {canEdit ? (
              <ContactDetailForm
                clientId={client.id}
                contact={{
                  id: contact.id,
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  email: contact.email,
                  role: contact.role,
                }}
              />
            ) : (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted">{t('clients.field.contactEmail')}</dt>
                  <dd>{contact.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t('clients.contacts.role')}</dt>
                  <dd>{contact.role ?? '—'}</dd>
                </div>
              </dl>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('clients.contacts.portal.title')}
            action={
              canInvite && contact.email ? (
                <PortalInviteDialog
                  clientId={client.id}
                  clientName={client.name}
                  defaultEmail={contact.email}
                  trigger={
                    <Button variant="secondary" size="sm">
                      <UserPlus className="size-4" />
                      {t('team.portalInvite.open')}
                    </Button>
                  }
                />
              ) : undefined
            }
          />
          <CardBody className="space-y-4 text-sm">
            {!contact.email ? (
              <p className="text-muted">{t('clients.contacts.portal.emailRequired')}</p>
            ) : portalMember && memberAccess ? (
              <ContactPortalAccessPanel
                member={portalMember}
                memberAccess={memberAccess}
                assignableRoles={assignableRoles}
                roleDetails={roleDetails}
                roleGrantedKeys={roleGrantedKeys}
                catalog={catalog}
                scopeResources={scopeResources}
                canEditAccess={canEditAccess}
              />
            ) : (
              <p className="text-muted">{t('clients.contacts.portal.notInvited')}</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
