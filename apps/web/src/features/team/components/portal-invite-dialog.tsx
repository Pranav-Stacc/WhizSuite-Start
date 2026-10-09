import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { invitePortalUserAction } from '../actions/member.actions';

interface PortalInviteDialogProps {
  clientId: string;
  clientName: string;
  defaultEmail?: string;
  trigger: ReactNode;
}

export function PortalInviteDialog({ clientId, clientName, defaultEmail, trigger }: PortalInviteDialogProps) {
  const fields: FieldDef[] = [
    { name: 'email', label: t('team.invite.email'), type: 'email', required: true, span: 2 },
  ];
  return (
    <FormDialog
      schema="portalInvite"
      title={t('team.portalInvite.heading', { client: clientName })}
      description={t('team.portalInvite.desc')}
      submitLabel={t('team.invite.send')}
      fields={fields}
      defaults={{ email: defaultEmail ?? '' }}
      action={invitePortalUserAction.bind(null, clientId)}
      trigger={trigger}
    />
  );
}
