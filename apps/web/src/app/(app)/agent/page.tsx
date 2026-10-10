import { redirect } from 'next/navigation';
import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { param, type SearchParams } from '@/shared/ui/nav-controls';

export const metadata: Metadata = { title: t('agent.title') };

/** Agent lives inside Chat as Whiz — keep /agent as a deep-link redirect. */
export default async function AgentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission(Permissions.AI_CHAT);
  const sp = await searchParams;
  const sessionId = param(sp, 'session');
  redirect(sessionId ? `/chat?whiz=1&session=${sessionId}` : '/chat?whiz=1');
}
