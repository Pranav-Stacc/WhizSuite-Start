import type { ReactNode } from 'react';
import { AutomationActions, AutomationTriggers } from '@agency-os/contracts';
import { t, type MessageKey } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { createAutomationAction, deleteAutomationAction, updateAutomationAction } from '../actions/automation.actions';
import type { Automation } from '../data/automations.repository';

interface AutomationDialogProps {
  automation?: Automation;
  trigger?: ReactNode;
  defaultOpen?: boolean;
}

export function AutomationDialog({ automation, trigger, defaultOpen }: AutomationDialogProps) {
  const fields: FieldDef[] = [
    { name: 'name', label: t('automations.field.name'), placeholder: t('automations.field.name.placeholder'), required: true, span: 2 },
    {
      name: 'trigger',
      label: t('automations.field.trigger'),
      type: 'select',
      required: true,
      hint: t('automations.field.trigger.hint'),
      options: AutomationTriggers.map((value) => ({ value, label: t(`automations.trigger.${value}` as MessageKey) })),
    },
    {
      name: 'action',
      label: t('automations.field.action'),
      type: 'select',
      required: true,
      hint: t('automations.field.action.hint'),
      options: AutomationActions.map((value) => ({ value, label: t(`automations.action.${value}` as MessageKey) })),
    },
  ];

  return (
    <FormDialog
      key={automation?.id ?? 'new'}
      schema="automation"
      title={automation ? t('automations.edit') : t('automations.create.title')}
      description={automation ? t('automations.edit.desc') : t('automations.create.desc')}
      submitLabel={automation ? t('common.save') : t('common.create')}
      fields={fields}
      defaults={automation ? { name: automation.name, trigger: automation.trigger, action: automation.action } : { name: '', trigger: '', action: '' }}
      action={automation ? updateAutomationAction.bind(null, automation.id) : createAutomationAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
      footerExtra={automation ? <ConfirmButton action={deleteAutomationAction.bind(null, automation.id)} label={t('automations.delete')} /> : undefined}
    />
  );
}
