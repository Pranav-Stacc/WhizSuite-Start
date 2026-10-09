import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { sendPortalMessageAction } from '@/features/portal/actions/portal.actions';
import { MessageThread } from '@/features/portal/components/message-thread';
import { clientThread } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.messages.title') };

export default async function PortalMessagesPage() {
  const session = await requireSession();
  const messages = await clientThread(session.clientId!);

  return (
    <div>
      <PageHeader title={t('portal.messages.title')} description={t('portal.messages.description')} eyebrow={<MessageSquare className="inline size-3.5" />} />

      <Card className="mb-4">
        <CardHeader title={t('portal.messages.thread')} />
        <CardBody className="max-h-[28rem] overflow-y-auto">
          <MessageThread messages={messages} viewer="client" />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <InlineMessageForm action={sendPortalMessageAction} label={t('portal.messages.compose')} placeholder={t('portal.messages.placeholder')} />
        </CardBody>
      </Card>
    </div>
  );
}
