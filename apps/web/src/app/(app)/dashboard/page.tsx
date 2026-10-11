import type { Metadata } from 'next';
import { Permissions, UserRoles } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import { getPermissions } from '@/shared/auth/permissions';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { CreatorDashboard } from '@/features/dashboard/components/creator-dashboard';
import { ManagerDashboard } from '@/features/dashboard/components/manager-dashboard';
import { OwnerDashboard } from '@/features/dashboard/components/owner-dashboard';
import { getSetupProgress } from '@/features/setup/services/setup-progress.service';
import { WorkspaceSetup } from '@/features/setup/components/workspace-setup';

export const metadata: Metadata = { title: t('nav.home') };

export default async function DashboardPage() {
  const session = await requireSession();
  const setup = await getSetupProgress();

  const dashboard = await resolveDashboard(session);

  return (
    <div>
      {setup && !setup.complete ? <WorkspaceSetup progress={setup} /> : null}
      {dashboard}
    </div>
  );
}

async function resolveDashboard(session: Awaited<ReturnType<typeof requireSession>>) {
  if (!isLiveMode || session.demo) {
    switch (session.role) {
      case UserRoles.OWNER:
        return <OwnerDashboard session={session} />;
      case UserRoles.MANAGER:
        return <ManagerDashboard session={session} />;
      default:
        return <CreatorDashboard session={session} />;
    }
  }

  const perms = await getPermissions();
  if (perms.has(Permissions.ORG_BILLING_MANAGE) || perms.has(Permissions.AUDIT_VIEW)) {
    return <OwnerDashboard session={session} />;
  }
  if (perms.has(Permissions.MEMBERS_VIEW) && perms.has(Permissions.CLIENTS_VIEW)) {
    return <ManagerDashboard session={session} />;
  }
  return <CreatorDashboard session={session} />;
}
