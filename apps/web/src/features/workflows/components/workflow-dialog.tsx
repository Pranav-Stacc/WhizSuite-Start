'use client';

import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MIN_WORKFLOW_STAGES, RoleKinds, type AccessRoleSummary } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { createWorkflowAction, deleteWorkflowAction, updateWorkflowAction } from '../actions/workflow.actions';
import type { Workflow, WorkflowStage } from '../data/workflows.repository';

interface WorkflowDialogProps {
  workflow?: Workflow;
  /** Workflow-kind roles available as stage assignee pools. */
  workflowRoles: AccessRoleSummary[];
  trigger?: ReactNode;
  defaultOpen?: boolean;
}

type DraftStage = { name: string; assigneeRoleId: string };

const emptyStage = (): DraftStage => ({ name: '', assigneeRoleId: '' });

function toDraft(stages: WorkflowStage[]): DraftStage[] {
  return stages.map((stage) => ({
    name: stage.name,
    assigneeRoleId: stage.assigneeRoleId ?? '',
  }));
}

export function WorkflowDialog({ workflow, workflowRoles, trigger, defaultOpen }: WorkflowDialogProps) {
  const editing = workflow !== undefined;
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [name, setName] = useState(workflow?.name ?? '');
  const [slaHours, setSlaHours] = useState(String(workflow?.slaHours ?? 48));
  const [requiresClientApproval, setRequiresClientApproval] = useState(workflow?.requiresClientApproval ?? true);
  const [stages, setStages] = useState<DraftStage[]>(() =>
    workflow ? toDraft(workflow.stages) : [emptyStage(), emptyStage()],
  );
  const [pending, startTransition] = useTransition();

  const roleOptions = useMemo(
    () => workflowRoles.filter((role) => role.kind === RoleKinds.WORKFLOW || !role.isSystem),
    [workflowRoles],
  );

  const reset = () => {
    setName(workflow?.name ?? '');
    setSlaHours(String(workflow?.slaHours ?? 48));
    setRequiresClientApproval(workflow?.requiresClientApproval ?? true);
    setStages(workflow ? toDraft(workflow.stages) : [emptyStage(), emptyStage()]);
  };

  const updateStage = (index: number, patch: Partial<DraftStage>) => {
    setStages((prev) => prev.map((stage, i) => (i === index ? { ...stage, ...patch } : stage)));
  };

  const submit = () => {
    startTransition(async () => {
      const input = {
        name,
        slaHours: Number(slaHours) || 48,
        requiresClientApproval,
        stages: stages
          .map((stage) => ({
            name: stage.name.trim(),
            assigneeRoleId: stage.assigneeRoleId || null,
          }))
          .filter((stage) => stage.name.length > 0),
      };
      const result = editing
        ? await updateWorkflowAction(workflow.id, input)
        : await createWorkflowAction(input);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        if (!editing) reset();
      } else toast.error(result.message);
    });
  };

  const openDialog = () => {
    reset();
    setOpen(true);
  };

  const canSubmit =
    name.trim().length >= 2 &&
    stages.filter((stage) => stage.name.trim()).length >= MIN_WORKFLOW_STAGES;

  return (
    <>
      {trigger ? <span onClick={openDialog}>{trigger}</span> : null}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('workflows.edit') : t('workflows.create.title')}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{editing ? t('workflows.edit.desc') : t('workflows.create.desc')}</p>
          <Field label={t('workflows.field.name')} htmlFor="wf-name">
            <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('workflows.field.name.placeholder')} />
          </Field>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('workflows.field.stages')}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStages((prev) => [...prev, emptyStage()])}
              >
                <Plus className="size-4" />
                {t('workflows.stages.add')}
              </Button>
            </div>
            <p className="mb-2 text-xs text-muted">{t('workflows.field.stages.hint')}</p>
            <ul className="space-y-2">
              {stages.map((stage, index) => (
                <li key={index} className="grid gap-2 rounded-xl border border-border-soft p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field label={t('workflows.stages.name')} htmlFor={`wf-stage-${index}`}>
                    <Input
                      id={`wf-stage-${index}`}
                      value={stage.name}
                      onChange={(e) => updateStage(index, { name: e.target.value })}
                      placeholder={t('workflows.field.stages.placeholder')}
                    />
                  </Field>
                  <Field label={t('workflows.stages.role')} htmlFor={`wf-role-${index}`}>
                    <Select
                      id={`wf-role-${index}`}
                      value={stage.assigneeRoleId}
                      onChange={(e) => updateStage(index, { assigneeRoleId: e.target.value })}
                    >
                      <option value="">{t('workflows.stages.role.none')}</option>
                      {roleOptions.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                          {role.kind === RoleKinds.WORKFLOW ? ` · ${t('roles.kind.workflow')}` : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={stages.length <= MIN_WORKFLOW_STAGES}
                      onClick={() => setStages((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={t('workflows.stages.remove')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Field label={t('workflows.field.sla')} htmlFor="wf-sla" hint={t('workflows.field.sla.hint')}>
            <Input id="wf-sla" type="number" min={1} value={slaHours} onChange={(e) => setSlaHours(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresClientApproval}
              onChange={(e) => setRequiresClientApproval(e.target.checked)}
              className="size-4 accent-primary"
            />
            {t('workflows.field.clientApproval')}
          </label>
          <Button variant="primary" className="w-full" disabled={pending || !canSubmit} onClick={submit}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {editing ? t('common.save') : t('common.create')}
          </Button>
          {editing ? (
            <ConfirmButton action={deleteWorkflowAction.bind(null, workflow.id)} label={t('workflows.delete')} />
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
