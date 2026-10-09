import type { ReactNode } from 'react';
import type { AccessRoleSummary } from '@agency-os/contracts';
import { t, type MessageKey } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { inviteMemberAction } from '../actions/member.actions';
import { INVITABLE_MEMBERSHIPS } from '../config';

interface InviteDialogProps {
  trigger?: ReactNode;
  defaultOpen?: boolean;
  /** Custom roles the inviter may grant up front; omitted when they cannot manage roles. */
  customRoles?: AccessRoleSummary[];
}

export function InviteDialog({ trigger, defaultOpen, customRoles = [] }: InviteDialogProps) {
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
    ...(customRoles.length > 0
      ? [
          {
            name: 'roleIds',
            label: t('team.invite.roles'),
            type: 'multiselect',
            hint: t('team.invite.roles.hint'),
            options: customRoles.map((role) => ({ value: role.id, label: role.name })),
          } satisfies FieldDef,
        ]
      : []),
  ];

  return (
    <FormDialog
      schema="invite"
      title={t('team.invite.heading')}
      description={t('team.invite.desc')}
      submitLabel={t('team.invite.send')}
      fields={fields}
      defaults={{ email: '', membershipType: 'MEMBER', note: '', roleIds: [] }}
      action={inviteMemberAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
    />
  );
}
