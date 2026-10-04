import type { Metadata } from 'next';
import { UserRoles } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { CreatorDashboard } from '@/features/dashboard/components/creator-dashboard';
import { ManagerDashboard } from '@/features/dashboard/components/manager-dashboard';
import { OwnerDashboard } from '@/features/dashboard/components/owner-dashboard';

export const metadata: Metadata = { title: t('nav.home') };

export default async function DashboardPage() {
  const session = await requireSession();
  switch (session.role) {
    case UserRoles.OWNER:
      return <OwnerDashboard session={session} />;
    case UserRoles.MANAGER:
      return <ManagerDashboard session={session} />;
    default:
      return <CreatorDashboard session={session} />;
  }
}
