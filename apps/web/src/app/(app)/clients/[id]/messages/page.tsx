import { Permissions } from '@agency-os/contracts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { SectionHeading } from '@/shared/ui/section-heading';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { openClientRoom } from '@/features/chat/services/chat.service';

export const metadata = { title: t('clients.workspace.messages') };

export default async function ClientMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permissions.CHAT_VIEW);
  const client = await getClient((await params).id);
  if (!client) notFound();

  const room = await openClientRoom(client.id, client.name);

  return (
    <section>
      <SectionHeading number={clientSectionNumber('messages')} title={t('clients.workspace.messages')} />
      <p className="mb-4 text-[13px] text-muted">{t('portal.messages.agencyDescription')}</p>
      <Button asChild>
        <Link href={`/chat?room=${room.id}`}>{t('chat.title')}</Link>
      </Button>
    </section>
  );
}
