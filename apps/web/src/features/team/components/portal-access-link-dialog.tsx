import type { ReactNode } from 'react';
import { PortalAccessModes } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { createPortalAccessLinkAction } from '../actions/member.actions';

interface PortalAccessLinkDialogProps {
  clientId: string;
  clientName: string;
  trigger: ReactNode;
}

export function PortalAccessLinkDialog({ clientId, clientName, trigger }: PortalAccessLinkDialogProps) {
  const fields: FieldDef[] = [
    {
      name: 'accessMode',
      label: t('team.portalLink.accessMode'),
      type: 'select',
      required: true,
      span: 2,
      options: PortalAccessModes.map((mode) => ({
        value: mode,
        label: t(`team.portalLink.mode.${mode}`),
      })),
      hint: t('team.portalLink.accessModeHint'),
    },
    {
      name: 'membershipTtlHours',
      label: t('team.portalLink.membershipTtl'),
      type: 'number',
      span: 1,
      hint: t('team.portalLink.membershipTtlHint'),
    },
    {
      name: 'maxUses',
      label: t('team.portalLink.maxUses'),
      type: 'number',
      span: 1,
      hint: t('team.portalLink.maxUsesHint'),
    },
  ];

  return (
    <FormDialog
      schema="portalAccessLink"
      title={t('team.portalLink.heading', { client: clientName })}
      description={t('team.portalLink.desc')}
      submitLabel={t('team.portalLink.create')}
      fields={fields}
      defaults={{ accessMode: 'TEMPORARY', membershipTtlHours: 168 }}
      action={createPortalAccessLinkAction.bind(null, clientId)}
      trigger={trigger}
    />
  );
}
