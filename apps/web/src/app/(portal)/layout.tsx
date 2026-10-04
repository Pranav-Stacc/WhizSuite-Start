import { UserRoles } from '@agency-os/contracts';
import { redirect } from 'next/navigation';
import { requireSession } from '@/shared/auth/session';
import { homeFor } from '@/shared/auth/roles';
import { PortalShell } from '@/features/portal/components/portal-shell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.role !== UserRoles.CLIENT) redirect(homeFor(session.role));
  if (!session.clientId) redirect('/login');
  return <PortalShell session={session}>{children}</PortalShell>;
}
