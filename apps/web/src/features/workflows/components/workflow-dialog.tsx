'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ApproverBases,
  ApprovalStepRules,
  WorkflowSubjects,
  type AccessRoleSummary,
  type ApprovalStepRule,
  type ApproverBasis,
  type WorkflowSubject,
} from '@agency-os/contracts';
import type { Member } from '@/features/team/data/members.repository';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { createWorkflowAction, deleteWorkflowAction, updateWorkflowAction } from '../actions/workflow.actions';
import { WorkflowShareButton } from './workflow-share-button';
import type { Workflow, WorkflowStage } from '../data/workflows.repository';

export interface NamedOption {
  id: string;
  label: string;
}

interface WorkflowDialogProps {
  workflow?: Workflow;
  workflowRoles: AccessRoleSummary[];
  members?: Member[];
  designations?: NamedOption[];
  departments?: NamedOption[];
  clients?: NamedOption[];
  clientContacts?: NamedOption[];
  projects?: NamedOption[];
  trigger?: ReactNode;
  defaultOpen?: boolean;
}

type DraftStage = {
  key: string;
  name: string;
  approvalRule: ApprovalStepRule;
  quorumCount: string;
  basis: ApproverBasis;
  targetIds: string[];
};

const SUBJECT_LABEL = {
  content: 'workflows.subject.content',
  task: 'workflows.subject.task',
  project: 'workflows.subject.project',
  custom: 'workflows.subject.custom',
} as const;

const BASIS_LABEL = {
  PERSON: 'workflows.basis.PERSON',
  ROLE: 'workflows.basis.ROLE',
  DESIGNATION: 'workflows.basis.DESIGNATION',
  DEPARTMENT: 'workflows.basis.DEPARTMENT',
  CLIENT: 'workflows.basis.CLIENT',
  CLIENT_CONTACT: 'workflows.basis.CLIENT_CONTACT',
  PROJECT: 'workflows.basis.PROJECT',
  ASSIGNEE: 'workflows.basis.ASSIGNEE',
} as const;

let stageSeq = 0;
const nextKey = () => `stage-${++stageSeq}`;

function inferBasis(stage: WorkflowStage): ApproverBasis {
  if (stage.basis && (ApproverBases as readonly string[]).includes(stage.basis)) return stage.basis;
  if ((stage.roleIds?.length ?? 0) > 0) return 'ROLE';
  return 'PERSON';
}

function inferTargets(stage: WorkflowStage, basis: ApproverBasis): string[] {
  if ((stage.targetIds?.length ?? 0) > 0) return stage.targetIds ?? [];
  if (basis === 'ROLE') return stage.roleIds ?? [];
  if (basis === 'PERSON') return stage.approverIds ?? [];
  return [];
}

const emptyStage = (): DraftStage => ({
  key: nextKey(),
  name: '',
  approvalRule: 'ANY',
  quorumCount: '2',
  basis: 'ROLE',
  targetIds: [],
});

function toDraft(stages: WorkflowStage[]): DraftStage[] {
  return stages.map((stage) => {
    const basis = inferBasis(stage);
    return {
      key: nextKey(),
      name: stage.name,
      approvalRule: stage.approvalRule ?? 'ANY',
      quorumCount: String(stage.quorumCount ?? 2),
      basis,
      targetIds: inferTargets(stage, basis),
    };
  });
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

function SearchList({
  items,
  selected,
  onToggle,
  empty,
}: {
  items: NamedOption[];
  selected: string[];
  onToggle: (id: string) => void;
  empty: string;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? items.filter((item) => item.label.toLowerCase().includes(needle)) : items;
  return (
    <div className="space-y-1.5">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('workflows.stages.search')}
        className="h-8"
        aria-label={t('workflows.stages.search')}
      />
      <ul className="max-h-28 space-y-0.5 overflow-y-auto rounded-lg border border-border-soft p-1">
        {shown.length === 0 ? (
          <li className="px-2 py-1.5 text-xs text-muted">{items.length === 0 ? empty : t('workflows.stages.pick.empty')}</li>
        ) : (
          shown.map((item) => (
            <li key={item.id}>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface-2',
                  selected.includes(item.id) && 'bg-primary/10',
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="size-3.5 accent-primary"
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function WorkflowDialog({
  workflow,
  workflowRoles,
  members = [],
  designations = [],
  departments = [],
  clients = [],
  clientContacts = [],
  projects = [],
  trigger,
  defaultOpen,
}: WorkflowDialogProps) {
  const editing = workflow !== undefined;
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [name, setName] = useState(workflow?.name ?? '');
  const [subject, setSubject] = useState<WorkflowSubject>(
    WorkflowSubjects.find((value) => value === workflow?.entityType) ?? 'content',
  );
  const [scopedToClient, setScopedToClient] = useState(workflow?.scopeType === 'CLIENT');
  const [clientId, setClientId] = useState(workflow?.scopeType === 'CLIENT' ? (workflow.scopeId ?? '') : '');
  const [slaHours, setSlaHours] = useState(String(workflow?.slaHours ?? 48));
  const [requiresClientApproval, setRequiresClientApproval] = useState(workflow?.requiresClientApproval ?? false);
  const [stages, setStages] = useState<DraftStage[]>(() => (workflow ? toDraft(workflow.stages) : [emptyStage()]));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const people = useMemo(
    () =>
      members
        .filter((member) => member.status === 'ACTIVE')
        .map((member) => ({
          id: member.userId ?? member.id,
          label: member.name,
        }))
        .filter((row) => row.id.length > 0),
    [members],
  );
  const roles = useMemo(
    () => workflowRoles.map((role) => ({ id: role.id, label: role.name })),
    [workflowRoles],
  );

  const optionsFor = (basis: ApproverBasis): NamedOption[] => {
    switch (basis) {
      case 'PERSON':
        return people;
      case 'ROLE':
        return roles;
      case 'DESIGNATION':
        return designations;
      case 'DEPARTMENT':
        return departments;
      case 'CLIENT':
        return clients;
      case 'CLIENT_CONTACT':
        return clientContacts;
      case 'PROJECT':
        return projects;
      default:
        return [];
    }
  };

  const reset = () => {
    setName(workflow?.name ?? '');
    setSubject(WorkflowSubjects.find((value) => value === workflow?.entityType) ?? 'content');
    setScopedToClient(workflow?.scopeType === 'CLIENT');
    setClientId(workflow?.scopeType === 'CLIENT' ? (workflow.scopeId ?? '') : '');
    setSlaHours(String(workflow?.slaHours ?? 48));
    setRequiresClientApproval(workflow?.requiresClientApproval ?? false);
    setStages(workflow ? toDraft(workflow.stages) : [emptyStage()]);
  };

  const updateStage = (key: string, patch: Partial<DraftStage>) => {
    setStages((prev) => prev.map((stage) => (stage.key === key ? { ...stage, ...patch } : stage)));
  };

  const submit = () => {
    startTransition(async () => {
      const input = {
        name,
        entityType: subject,
        scopeType: scopedToClient ? 'CLIENT' as const : 'ORGANIZATION' as const,
        scopeId: scopedToClient ? clientId || null : null,
        slaHours: Number(slaHours) || 48,
        requiresClientApproval,
        stages: stages
          .map((stage) => ({
            name: stage.name.trim(),
            approvalRule: stage.approvalRule,
            quorumCount: stage.approvalRule === 'QUORUM' ? Math.max(1, Number(stage.quorumCount) || 1) : undefined,
            basis: stage.basis,
            targetIds: stage.basis === 'ASSIGNEE' ? [] : stage.targetIds,
            roleIds: stage.basis === 'ROLE' ? stage.targetIds : [],
            approverIds: stage.basis === 'PERSON' ? stage.targetIds : [],
            assigneeRoleId: stage.basis === 'ROLE' ? (stage.targetIds[0] ?? null) : null,
          }))
          .filter((stage) => stage.name.length > 0),
      };
      const result = editing ? await updateWorkflowAction(workflow.id, input) : await createWorkflowAction(input);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        if (!editing) reset();
      } else toast.error(result.message);
    });
  };

  const canSubmit =
    name.trim().length >= 2 &&
    stages.filter((stage) => stage.name.trim()).length >= 1 &&
    (!scopedToClient || clientId.length > 0) &&
    stages
      .filter((stage) => stage.name.trim())
      .every(
        (stage) =>
          stage.basis === 'ASSIGNEE' || stage.targetIds.length > 0,
      );

  return (
    <>
      {trigger ? (
        <span onClick={() => { reset(); setOpen(true); }}>{trigger}</span>
      ) : null}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('workflows.edit') : t('workflows.create.title')}
        width="max-w-lg"
        footer={editing && workflow ? <WorkflowShareButton workflowId={workflow.id} /> : undefined}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">{editing ? t('workflows.edit.desc') : t('workflows.create.desc')}</p>
          <Field label={t('workflows.field.name')} htmlFor="wf-name">
            <Input id="wf-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t('workflows.field.name.placeholder')} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={t('workflows.field.subject')} htmlFor="wf-subject">
              <Select id="wf-subject" value={subject} onChange={(event) => setSubject(event.target.value as WorkflowSubject)}>
                {WorkflowSubjects.map((value) => (
                  <option key={value} value={value}>{t(SUBJECT_LABEL[value])}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('workflows.field.scope')} htmlFor="wf-scope">
              <Select
                id="wf-scope"
                value={scopedToClient ? 'CLIENT' : 'ORGANIZATION'}
                onChange={(event) => {
                  const next = event.target.value === 'CLIENT';
                  setScopedToClient(next);
                  if (!next) setClientId('');
                }}
              >
                <option value="ORGANIZATION">{t('workflows.scope.organization')}</option>
                <option value="CLIENT">{t('workflows.scope.client')}</option>
              </Select>
            </Field>
          </div>
          {scopedToClient ? (
            <Field label={t('workflows.field.client')} htmlFor="wf-client">
              <SearchList
                items={clients}
                selected={clientId ? [clientId] : []}
                onToggle={(id) => setClientId(clientId === id ? '' : id)}
                empty={t('workflows.stages.pick.empty')}
              />
            </Field>
          ) : null}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('workflows.field.stages')}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStages((prev) => [...prev, emptyStage()])}>
                <Plus className="size-4" />
                {t('workflows.stages.add')}
              </Button>
            </div>
            <p className="mb-2 text-xs text-muted">{t('workflows.field.stages.hint')}</p>
            <ul className="space-y-2">
              {stages.map((stage, index) => (
                <li key={stage.key} className="space-y-2 rounded-xl border border-border-soft p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{index + 1}</span>
                    <Input
                      value={stage.name}
                      onChange={(event) => updateStage(stage.key, { name: event.target.value })}
                      placeholder={t('workflows.field.stages.placeholder')}
                      aria-label={t('workflows.stages.name')}
                      className="h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={stages.length <= 1}
                      onClick={() => setStages((prev) => prev.filter((item) => item.key !== stage.key))}
                      aria-label={t('workflows.stages.remove')}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      value={stage.approvalRule}
                      aria-label={t('workflows.stages.rule')}
                      className="h-8"
                      onChange={(event) => updateStage(stage.key, { approvalRule: event.target.value as ApprovalStepRule })}
                    >
                      {ApprovalStepRules.map((rule) => (
                        <option key={rule} value={rule}>{t(`workflows.stages.rule.${rule}` as 'workflows.stages.rule.ANY')}</option>
                      ))}
                    </Select>
                    <Select
                      value={stage.basis}
                      aria-label={t('workflows.stages.basis')}
                      className="h-8"
                      onChange={(event) => updateStage(stage.key, { basis: event.target.value as ApproverBasis, targetIds: [] })}
                    >
                      {ApproverBases.map((basis) => (
                        <option key={basis} value={basis}>{t(BASIS_LABEL[basis])}</option>
                      ))}
                    </Select>
                  </div>
                  {stage.approvalRule === 'QUORUM' ? (
                    <Input
                      type="number"
                      min={1}
                      value={stage.quorumCount}
                      aria-label={t('workflows.stages.quorum')}
                      className="h-8"
                      onChange={(event) => updateStage(stage.key, { quorumCount: event.target.value })}
                    />
                  ) : null}
                  {stage.basis === 'ASSIGNEE' ? (
                    <p className="text-xs text-muted">{t('workflows.basis.ASSIGNEE.hint')}</p>
                  ) : (
                    <SearchList
                      items={optionsFor(stage.basis)}
                      selected={stage.targetIds}
                      onToggle={(id) => updateStage(stage.key, { targetIds: toggleId(stage.targetIds, id) })}
                      empty={t('workflows.stages.roles.empty')}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label={t('workflows.field.sla')} htmlFor="wf-sla">
              <Input id="wf-sla" type="number" min={1} value={slaHours} onChange={(event) => setSlaHours(event.target.value)} className="h-8" />
            </Field>
            <label className="flex h-8 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresClientApproval}
                onChange={(event) => setRequiresClientApproval(event.target.checked)}
                className="size-4 accent-primary"
              />
              {t('workflows.field.clientApproval')}
            </label>
          </div>
          <Button variant="primary" className="w-full" disabled={pending || !canSubmit} onClick={submit}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {editing ? t('common.save') : t('common.create')}
          </Button>
          {editing ? <ConfirmButton action={deleteWorkflowAction.bind(null, workflow.id)} label={t('workflows.delete')} /> : null}
        </div>
      </Sheet>
    </>
  );
}
