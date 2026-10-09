import { notFound } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { ClientStatuses } from '@agency-os/contracts';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { ROLES_LEADERSHIP, ROLES_STAFF } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusMenu } from '@/shared/ui/status-menu';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { setClientStatusAction } from '@/features/clients/actions/client.actions';
import { BrandTab, OverviewTab, WorkTab } from '@/features/clients/components/client-sections';
import { HealthPill } from '@/features/clients/components/health-pill';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { listContent } from '@/features/content/services/content.service';
import { listIntegrations } from '@/features/integrations/services/integrations.service';
import { listProjectsWithProgress } from '@/features/projects/services/projects.service';
import { PortalInviteDialog } from '@/features/team/components/portal-invite-dialog';
import { membersById } from '@/features/team/services/members.service';

const RECENT_CONTENT_LIMIT = 6;

const GUIDE: GuideItem[] = [{ title: t('clients.guide.detail.title'), body: t('clients.guide.detail.body') }];

export default async function ClientOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(ROLES_STAFF);
  const client = await getClient((await params).id);
  if (!client) notFound();

  const canManage = ROLES_LEADERSHIP.includes(session.role);
  const [members, integrations, projects, content] = await Promise.all([membersById(), listIntegrations(), listProjectsWithProgress(), listContent()]);
  const clientProjects = projects.filter((p) => p.clientId === client.id);
  const clientPosts = content
    .filter((c) => c.clientId === client.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, RECENT_CONTENT_LIMIT);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="eyebrow mb-2">{client.industry}</p>
          <h1 className="display truncate text-[30px] sm:text-[36px]">{client.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted">
            <HealthPill score={client.health} showLabel />
            <span className="tabular-nums">
              {formatMoney(client.retainerMinor)} <span className="eyebrow ml-1">{t('clients.col.retainer')}</span>
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageGuide items={GUIDE} />
          {canManage ? (
            <PortalInviteDialog
              clientId={client.id}
              clientName={client.name}
              defaultEmail={client.contactEmail}
              trigger={
                <Button variant="secondary" size="sm">
                  <UserPlus />
                  {t('team.portalInvite.open')}
                </Button>
              }
            />
          ) : null}
          {canManage ? (
            <StatusMenu
              current={client.status}
              label={t('clients.status.change')}
              options={ClientStatuses.map((s) => ({ value: s, label: statusLabel('client', s), color: TONE_COLOR[statusTone('client', s)] }))}
              action={setClientStatusAction.bind(null, client.id)}
            />
          ) : null}
        </div>
      </header>

      <section>
        <SectionHeading number={clientSectionNumber('overview')} title={t('clients.workspace.overview')} />
        <OverviewTab client={client} ownerName={members.get(client.ownerId)?.name} integrations={integrations.filter((i) => i.clientId === client.id)} />
      </section>
      <section>
        <SectionHeading title={t('clients.tab.brand')} />
        <BrandTab client={client} canEdit={canManage} />
      </section>
      <section>
        <SectionHeading title={t('clients.tab.work')} />
        <WorkTab clientId={client.id} projects={clientProjects} posts={clientPosts} canManage={canManage} />
      </section>
    </div>
  );
}
