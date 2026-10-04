import type { ReactNode } from 'react';
import { t, type MessageKey } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { inviteMemberAction } from '../actions/member.actions';
import { INVITABLE_MEMBERSHIPS } from '../config';

export function InviteDialog({ trigger, defaultOpen }: { trigger?: ReactNode; defaultOpen?: boolean }) {
  const fields: FieldDef[] = [
    { name: 'email', label: t('team.invite.email'), type: 'email', placeholder: t('team.invite.email.placeholder'), required: true, span: 2 },
    {
      name: 'membershipType',
      label: t('team.invite.access'),
      type: 'select',
      required: true,
      hint: t('team.invite.access.hint'),
      options: INVITABLE_MEMBERSHIPS.map((value) => ({ value, label: t(`team.access.${value}` as MessageKey) })),
    },
    { name: 'note', label: t('team.invite.title'), placeholder: t('team.invite.title.placeholder') },
  ];

  return (
    <FormDialog
      schema="invite"
      title={t('team.invite.heading')}
      description={t('team.invite.desc')}
      submitLabel={t('team.invite.send')}
      fields={fields}
      defaults={{ email: '', membershipType: 'MEMBER', note: '' }}
      action={inviteMemberAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
    />
  );
}
