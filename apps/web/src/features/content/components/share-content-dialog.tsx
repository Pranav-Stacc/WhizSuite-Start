'use client';

import { useState, useTransition } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Select } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import { shareContentInDmAction } from '../actions/content.actions';

interface ShareContentDialogProps {
  contentId: string;
  title: string;
  members: Array<{ userId: string; name: string }>;
  trigger: React.ReactNode;
}

export function ShareContentDialog({ contentId, title, members, trigger }: ShareContentDialogProps) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const share = () => {
    setError(null);
    start(async () => {
      const result = await shareContentInDmAction({ contentId, userId, title });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.data?.href) {
        window.location.href = result.data.href;
      }
      setOpen(false);
    });
  };

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Modal
        open={open}
        onOpenChange={(next) => !pending && setOpen(next)}
        title={t('content.share.dm.title')}
        description={t('content.share.dm.desc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={share} disabled={pending || !userId}>
              {pending ? <Loader2 className="animate-spin" /> : <MessageCircle />}
              {t('content.share.dm.send')}
            </Button>
          </>
        }
      >
        <Field label={t('content.share.dm.recipient')} required>
          <Select value={userId} onChange={(e) => setUserId(e.target.value)} disabled={pending} required>
            <option value="" disabled>{t('content.share.dm.pick')}</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>{member.name}</option>
            ))}
          </Select>
        </Field>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Modal>
    </>
  );
}
