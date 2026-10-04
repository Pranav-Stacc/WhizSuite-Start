import { UserRoles } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { homeFor } from '@/shared/auth/roles';
import { redirect } from 'next/navigation';
import { AppShell } from '@/features/shell/components/app-shell';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.role === UserRoles.CLIENT) redirect(homeFor(session.role));
  return <AppShell session={session}>{children}</AppShell>;
}
