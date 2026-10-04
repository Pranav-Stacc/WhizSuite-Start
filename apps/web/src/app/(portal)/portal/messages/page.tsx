import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatDateTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { sendPortalMessageAction } from '@/features/portal/actions/portal.actions';
import { portalMessages } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.messages.title') };

export default async function PortalMessagesPage() {
  const session = await requireSession();
  const messages = await portalMessages(session.clientId!);

  return (
    <div>
      <PageHeader title={t('portal.messages.title')} description={t('portal.messages.description')} eyebrow={<MessageSquare className="inline size-3.5" />} />

      <Card className="mb-4">
        <CardHeader title={t('portal.messages.thread')} />
        <CardBody className="max-h-[28rem] space-y-4 overflow-y-auto">
          {messages.map((message) => (
            <div key={message.id} className={message.fromClient ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.fromClient ? 'bg-primary/14' : 'bg-surface-3'}`}>
                <div className="mb-1 flex items-center gap-2">
                  {!message.fromClient ? <Avatar name={message.authorName} size="xs" /> : null}
                  <span className="text-xs font-medium">{message.authorName}</span>
                  <span className="text-[11px] text-muted">{formatDateTime(message.at)}</span>
                </div>
                <p className="text-sm leading-relaxed">{message.body}</p>
              </div>
            </div>
          ))}
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
