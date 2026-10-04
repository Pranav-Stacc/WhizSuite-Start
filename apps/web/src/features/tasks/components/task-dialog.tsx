import type { ReactNode } from 'react';
import { Priorities, TaskStatuses } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { toDateKey } from '@/shared/lib/format';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { statusLabel } from '@/shared/ui/status';
import type { Member } from '@/features/team/data/members.repository';
import type { Project } from '@/features/projects/data/projects.repository';
import { createTaskAction, deleteTaskAction, updateTaskAction } from '../actions/task.actions';
import type { Task } from '../data/tasks.repository';

interface TaskDialogProps {
  projects: Array<Pick<Project, 'id' | 'name'> & { clientName?: string }>;
  members: Array<Pick<Member, 'id' | 'name'>>;
  task?: Task;
  trigger?: ReactNode;
  defaultOpen?: boolean;
  defaultProjectId?: string;
  defaultAssigneeId?: string;
}

export function TaskDialog({ projects, members, task, trigger, defaultOpen, defaultProjectId, defaultAssigneeId }: TaskDialogProps) {
  const fields: FieldDef[] = [
    { name: 'title', label: t('tasks.field.title'), placeholder: t('tasks.field.title.placeholder'), required: true, span: 2 },
    {
      name: 'projectId',
      label: t('tasks.field.project'),
      type: 'select',
      required: true,
      options: projects.map((p) => ({ value: p.id, label: p.clientName ? `${p.clientName} · ${p.name}` : p.name })),
    },
    { name: 'assigneeId', label: t('tasks.field.assignee'), type: 'select', options: members.map((m) => ({ value: m.id, label: m.name })) },
    { name: 'status', label: t('tasks.field.status'), type: 'select', required: true, options: TaskStatuses.map((s) => ({ value: s, label: statusLabel('task', s) })) },
    { name: 'priority', label: t('tasks.field.priority'), type: 'select', required: true, options: Priorities.map((p) => ({ value: p, label: statusLabel('priority', p) })) },
    { name: 'dueDate', label: t('tasks.field.due'), type: 'date' },
    { name: 'estimateHours', label: t('tasks.field.estimate'), type: 'number' },
    { name: 'description', label: t('tasks.field.description'), type: 'textarea', rows: 3 },
  ];

  const defaults = task
    ? {
        title: task.title,
        projectId: task.projectId,
        assigneeId: task.assigneeId ?? '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? toDateKey(task.dueDate) : '',
        estimateHours: task.estimateHours,
        description: task.description,
      }
    : { title: '', projectId: defaultProjectId ?? '', assigneeId: defaultAssigneeId ?? '', status: 'TODO', priority: 'MEDIUM', dueDate: '', estimateHours: '', description: '' };

  return (
    <FormDialog
      key={task?.id ?? 'new'}
      schema="task"
      title={task ? t('tasks.edit') : t('tasks.create.title')}
      description={task ? t('tasks.edit.desc') : t('tasks.create.desc')}
      submitLabel={task ? t('common.save') : t('common.create')}
      fields={fields}
      defaults={defaults}
      action={task ? updateTaskAction.bind(null, task.id) : createTaskAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
      footerExtra={task ? <ConfirmButton action={deleteTaskAction.bind(null, task.id)} label={t('tasks.delete')} /> : undefined}
    />
  );
}
