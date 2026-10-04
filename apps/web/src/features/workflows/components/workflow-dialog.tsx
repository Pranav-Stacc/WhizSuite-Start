import type { ReactNode } from 'react';
import { WORKFLOW_STAGE_SEPARATOR } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { createWorkflowAction, deleteWorkflowAction, updateWorkflowAction } from '../actions/workflow.actions';
import type { Workflow } from '../data/workflows.repository';

const STAGE_JOINER = `${WORKFLOW_STAGE_SEPARATOR} `;

interface WorkflowDialogProps {
  workflow?: Workflow;
  trigger?: ReactNode;
  defaultOpen?: boolean;
}

export function WorkflowDialog({ workflow, trigger, defaultOpen }: WorkflowDialogProps) {
  const fields: FieldDef[] = [
    { name: 'name', label: t('workflows.field.name'), placeholder: t('workflows.field.name.placeholder'), required: true, span: 2 },
    { name: 'stages', label: t('workflows.field.stages'), type: 'textarea', rows: 3, required: true, hint: t('workflows.field.stages.hint'), placeholder: t('workflows.field.stages.placeholder'), span: 2 },
    { name: 'slaHours', label: t('workflows.field.sla'), type: 'number', hint: t('workflows.field.sla.hint') },
    { name: 'requiresClientApproval', label: t('workflows.field.clientApproval'), type: 'checkbox', placeholder: t('workflows.field.clientApproval.hint') },
  ];

  return (
    <FormDialog
      key={workflow?.id ?? 'new'}
      schema="workflow"
      title={workflow ? t('workflows.edit') : t('workflows.create.title')}
      description={workflow ? t('workflows.edit.desc') : t('workflows.create.desc')}
      submitLabel={workflow ? t('common.save') : t('common.create')}
      fields={fields}
      defaults={
        workflow
          ? { name: workflow.name, stages: workflow.stages.join(STAGE_JOINER), slaHours: workflow.slaHours, requiresClientApproval: workflow.requiresClientApproval }
          : { name: '', stages: '', slaHours: 48, requiresClientApproval: true }
      }
      action={workflow ? updateWorkflowAction.bind(null, workflow.id) : createWorkflowAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
      footerExtra={workflow ? <ConfirmButton action={deleteWorkflowAction.bind(null, workflow.id)} label={t('workflows.delete')} /> : undefined}
    />
  );
}
