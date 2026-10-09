'use client';

import { useTransition, type ReactNode } from 'react';
import { ContractTypes } from '@agency-os/contracts';
import { toast } from 'sonner';
import { FormDialog } from '@/shared/forms/form-dialog';
import { t, type MessageKey } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { createAgreementAction, markAgreementSignedAction } from '../actions/agreement.actions';

export function NewAgreementDialog({
  clientId,
  trigger,
}: {
  clientId: string;
  trigger: ReactNode;
}) {
  return (
    <FormDialog
      schema="contract"
      title={t('clients.agreements.new')}
      trigger={trigger}
      submitLabel={t('clients.agreements.new')}
      defaults={{ clientId, title: '', type: 'MSA', startDate: '', endDate: '' }}
      action={createAgreementAction}
      fields={[
        { name: 'title', label: t('clients.agreements.title'), required: true, span: 2 },
        {
          name: 'type',
          label: t('clients.agreements.type'),
          type: 'select',
          options: ContractTypes.map((type) => ({
            value: type,
            label: t(`clients.agreements.types.${type}` as MessageKey),
          })),
        },
        { name: 'startDate', label: t('clients.agreements.start'), type: 'date' },
        { name: 'endDate', label: t('clients.agreements.end'), type: 'date' },
      ]}
    />
  );
}

export function MarkSignedButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await markAgreementSignedAction(id);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {t('clients.agreements.markSigned')}
    </Button>
  );
}
