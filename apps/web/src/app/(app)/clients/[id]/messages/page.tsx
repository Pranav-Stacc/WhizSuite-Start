import { notFound } from 'next/navigation';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { Card, CardBody } from '@/shared/ui/card';
import { SectionHeading } from '@/shared/ui/section-heading';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { replyToClientAction } from '@/features/portal/actions/portal.actions';
import { MessageThread } from '@/features/portal/components/message-thread';
import { clientThread } from '@/features/portal/services/portal.service';

export const metadata = { title: t('clients.workspace.messages') };

export default async function ClientMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(ROLES_STAFF);
  const client = await getClient((await params).id);
  if (!client) notFound();
  const messages = await clientThread(client.id);

  return (
    <section>
      <SectionHeading number={clientSectionNumber('messages')} title={t('clients.workspace.messages')} />
      <p className="mb-4 text-[13px] text-muted">{t('portal.messages.agencyDescription')}</p>
      <Card className="mb-4">
        <CardBody className="max-h-[32rem] overflow-y-auto">
          <MessageThread messages={messages} viewer="agency" />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <InlineMessageForm
            action={replyToClientAction.bind(null, client.id)}
            label={t('portal.messages.compose')}
            placeholder={t('portal.messages.agencyPlaceholder', { client: client.name })}
          />
        </CardBody>
      </Card>
    </section>
  );
}
