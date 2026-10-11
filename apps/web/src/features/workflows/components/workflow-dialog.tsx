'use client';

import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ApprovalStepRules,
  MIN_WORKFLOW_STAGES,
  type AccessRoleSummary,
  type ApprovalStepRule,
} from '@agency-os/contracts';
import { AssignRolesDialog } from '@/features/team/components/assign-roles-dialog';
import type { ScopeResourceOptions } from '@/features/team/components/scope-resource-fields';
import type { Member } from '@/features/team/data/members.repository';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { createWorkflowAction, deleteWorkflowAction, updateWorkflowAction } from '../actions/workflow.actions';
import type { Workflow, WorkflowStage } from '../data/workflows.repository';

interface WorkflowDialogProps {
  workflow?: Workflow;
  /** Roles available as stage assignee pools (any access role except owner). */
  workflowRoles: AccessRoleSummary[];
  /** Active team members that can be named as individual approvers. */
  members?: Member[];
  /** Roles grantable when editing a member's access from a stage. */
  assignableRoles?: AccessRoleSummary[];
  /** Department / team / client / project options for role-assignment scopes. */
  scopeResources?: ScopeResourceOptions;
  trigger?: ReactNode;
  defaultOpen?: boolean;
}

type DraftStage = {
  name: string;
  approvalRule: ApprovalStepRule;
  quorumCount: string;
  roleIds: string[];
  approverIds: string[];
};

const emptyStage = (): DraftStage => ({
  name: '',
  approvalRule: 'ANY',
  quorumCount: '2',
  roleIds: [],
  approverIds: [],
});

function toDraft(stages: WorkflowStage[]): DraftStage[] {
  return stages.map((stage) => {
    const roleIds = [
      ...new Set([
        ...(stage.roleIds ?? []),
        ...(stage.assigneeRoleId ? [stage.assigneeRoleId] : []),
      ]),
    ];
    return {
      name: stage.name,
      approvalRule: stage.approvalRule ?? 'ANY',
      quorumCount: String(stage.quorumCount ?? 2),
      roleIds,
      approverIds: stage.approverIds ?? [],
    };
  });
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

export function WorkflowDialog({
  workflow,
  workflowRoles,
  members = [],
  assignableRoles = [],
  scopeResources,
  trigger,
  defaultOpen,
}: WorkflowDialogProps) {
  const editing = workflow !== undefined;
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [name, setName] = useState(workflow?.name ?? '');
  const [slaHours, setSlaHours] = useState(String(workflow?.slaHours ?? 48));
  const [requiresClientApproval, setRequiresClientApproval] = useState(workflow?.requiresClientApproval ?? true);
  const [stages, setStages] = useState<DraftStage[]>(() =>
    workflow ? toDraft(workflow.stages) : [emptyStage()],
  );
  const [pending, startTransition] = useTransition();

  const roleOptions = workflowRoles;
  const people = useMemo(
    () => members.filter((member) => member.status === 'ACTIVE'),
    [members],
  );
  const membersById = useMemo(
    () => new Map(people.map((member) => [member.id, member])),
    [people],
  );

  const reset = () => {
    setName(workflow?.name ?? '');
    setSlaHours(String(workflow?.slaHours ?? 48));
    setRequiresClientApproval(workflow?.requiresClientApproval ?? true);
    setStages(workflow ? toDraft(workflow.stages) : [emptyStage()]);
  };

  const removeStage = (index: number) => {
    setStages((prev) => {
      if (prev.length <= MIN_WORKFLOW_STAGES) return prev;
      return prev.filter((_, i) => i !== index);
    });
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
            approvalRule: stage.approvalRule,
            quorumCount:
              stage.approvalRule === 'QUORUM'
                ? Math.max(1, Number(stage.quorumCount) || 1)
                : undefined,
            roleIds: stage.roleIds,
            assigneeRoleId: stage.roleIds[0] ?? null,
            approverIds: stage.approverIds,
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
        width="max-w-2xl"
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
            <ul className="space-y-3">
              {stages.map((stage, index) => (
                <li key={`stage-${index}-${stage.name}`} className="space-y-3 rounded-xl border border-border-soft p-3">
                  <div className="flex items-start gap-2">
                    <Field label={t('workflows.stages.name')} htmlFor={`wf-stage-${index}`} className="min-w-0 flex-1">
                      <Input
                        id={`wf-stage-${index}`}
                        value={stage.name}
                        onChange={(e) => updateStage(index, { name: e.target.value })}
                        placeholder={t('workflows.field.stages.placeholder')}
                      />
                    </Field>
                    <div className="pt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={stages.length <= MIN_WORKFLOW_STAGES}
                        onClick={() => removeStage(index)}
                        aria-label={t('workflows.stages.remove')}
                        title={
                          stages.length <= MIN_WORKFLOW_STAGES
                            ? t('workflows.stages.remove.blocked')
                            : t('workflows.stages.remove')
                        }
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label={t('workflows.stages.rule')} htmlFor={`wf-rule-${index}`}>
                      <Select
                        id={`wf-rule-${index}`}
                        value={stage.approvalRule}
                        onChange={(e) =>
                          updateStage(index, {
                            approvalRule: e.target.value as ApprovalStepRule,
                          })
                        }
                      >
                        {ApprovalStepRules.map((rule) => (
                          <option key={rule} value={rule}>
                            {t(`workflows.stages.rule.${rule}` as 'workflows.stages.rule.ANY')}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {stage.approvalRule === 'QUORUM' ? (
                      <Field
                        label={t('workflows.stages.quorum')}
                        htmlFor={`wf-quorum-${index}`}
                        hint={t('workflows.stages.quorum.hint')}
                      >
                        <Input
                          id={`wf-quorum-${index}`}
                          type="number"
                          min={1}
                          value={stage.quorumCount}
                          onChange={(e) => updateStage(index, { quorumCount: e.target.value })}
                        />
                      </Field>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-1.5 text-sm font-medium">{t('workflows.stages.roles')}</p>
                    <p className="mb-2 text-xs text-muted">{t('workflows.stages.roles.hint')}</p>
                    <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border-soft p-2">
                      {roleOptions.length === 0 ? (
                        <li className="px-2 py-1.5 text-xs text-muted">{t('workflows.stages.roles.empty')}</li>
                      ) : (
                        roleOptions.map((role) => (
                          <li key={role.id}>
                            <label
                              className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2',
                                stage.roleIds.includes(role.id) && 'bg-primary/10',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={stage.roleIds.includes(role.id)}
                                onChange={() =>
                                  updateStage(index, { roleIds: toggleId(stage.roleIds, role.id) })
                                }
                                className="size-3.5 accent-primary"
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {role.name}
                                {role.isSystem ? ` · ${t('roles.system')}` : ''}
                              </span>
                            </label>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-1.5 text-sm font-medium">{t('workflows.stages.people')}</p>
                    <p className="mb-2 text-xs text-muted">{t('workflows.stages.people.hint')}</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border-soft p-2">
                      {people.length === 0 ? (
                        <li className="px-2 py-1.5 text-xs text-muted">{t('workflows.stages.people.empty')}</li>
                      ) : (
                        people.map((member) => (
                          <li key={member.id} className="flex items-center gap-1">
                            <label
                              className={cn(
                                'flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2',
                                stage.approverIds.includes(member.id) && 'bg-primary/10',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={stage.approverIds.includes(member.id)}
                                onChange={() =>
                                  updateStage(index, {
                                    approverIds: toggleId(stage.approverIds, member.id),
                                  })
                                }
                                className="size-3.5 accent-primary"
                              />
                              <span className="min-w-0 flex-1 truncate">{member.name}</span>
                            </label>
                            {assignableRoles.length > 0 && stage.approverIds.includes(member.id) ? (
                              <AssignRolesDialog
                                member={membersById.get(member.id) ?? member}
                                assignable={assignableRoles}
                                resources={scopeResources}
                                trigger={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label={t('workflows.stages.people.access', { name: member.name })}
                                  >
                                    <Shield className="size-3.5" />
                                  </Button>
                                }
                              />
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
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
