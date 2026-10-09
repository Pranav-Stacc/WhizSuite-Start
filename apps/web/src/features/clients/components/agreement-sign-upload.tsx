'use client';

import { useRef, useState, useTransition } from 'react';
import { Download, FileUp, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import {
  completeAgreementUploadAction,
  downloadAgreementAction,
  presignAgreementUploadAction,
  signAgreementAction,
} from '../actions/agreement.actions';

export function AgreementPdfUpload({ id }: { id: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => input.current?.click()}>
        <FileUp />
        {t('clients.agreements.uploadPdf')}
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          start(async () => {
            if (file.type !== 'application/pdf') {
              toast.error(t('clients.agreements.pdfOnly'));
              return;
            }
            const ticket = await presignAgreementUploadAction(id, { filename: file.name, sizeBytes: file.size });
            if (!ticket.ok || !ticket.data) {
              toast.error(ticket.message);
              return;
            }
            const put = await fetch(ticket.data.uploadUrl, { method: 'PUT', headers: ticket.data.headers, body: file });
            if (!put.ok) {
              toast.error(t('clients.agreements.uploadFailed'));
              return;
            }
            const done = await completeAgreementUploadAction(id);
            if (done.ok) toast.success(done.message);
            else toast.error(done.message);
          });
          e.target.value = '';
        }}
      />
    </>
  );
}

export function SignAgreementButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <PenLine />
        {t('clients.agreements.collectSignature')}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('clients.agreements.collectSignature')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={pending || name.trim().length < 2}
              onClick={() =>
                start(async () => {
                  const result = await signAgreementAction(id, { signerName: name.trim(), method: 'TYPED' });
                  if (result.ok) {
                    toast.success(result.message);
                    setOpen(false);
                  } else toast.error(result.message);
                })
              }
            >
              {t('clients.agreements.sign')}
            </Button>
          </>
        }
      >
        <Field label={t('clients.agreements.signerName')} htmlFor={`sign-${id}`} required>
          <Input id={`sign-${id}`} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('clients.agreements.signerPlaceholder')} />
        </Field>
      </Modal>
    </>
  );
}

export function DownloadAgreementButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await downloadAgreementAction(id);
          if (!result.ok || !result.data?.url) {
            toast.error(result.message ?? t('toast.failed'));
            return;
          }
          window.open(result.data.url, '_blank', 'noopener,noreferrer');
        })
      }
    >
      <Download />
      {t('clients.agreements.download')}
    </Button>
  );
}
