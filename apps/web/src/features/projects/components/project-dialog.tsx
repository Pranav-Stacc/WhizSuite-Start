import type { ReactNode } from 'react';
import { ProjectStatuses } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { toDateKey } from '@/shared/lib/format';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { statusLabel } from '@/shared/ui/status';
import { createProjectAction, updateProjectAction } from '../actions/project.actions';
import type { Project } from '../data/projects.repository';

const MINOR_UNITS_PER_RUPEE = 100;

interface ProjectDialogProps {
  clients: Array<{ id: string; name: string }>;
  project?: Project;
  trigger?: ReactNode;
  defaultOpen?: boolean;
  defaultClientId?: string;
}

export function ProjectDialog({ clients, project, trigger, defaultOpen, defaultClientId }: ProjectDialogProps) {
  const fields: FieldDef[] = [
    { name: 'name', label: t('projects.field.name'), placeholder: t('projects.field.name.placeholder'), required: true, span: 2 },
    { name: 'clientId', label: t('projects.field.client'), type: 'select', required: true, options: clients.map((c) => ({ value: c.id, label: c.name })) },
    { name: 'type', label: t('projects.field.type'), placeholder: t('projects.field.type.placeholder') },
    { name: 'status', label: t('projects.field.status'), type: 'select', required: true, options: ProjectStatuses.map((s) => ({ value: s, label: statusLabel('project', s) })) },
    { name: 'endDate', label: t('projects.field.endDate'), type: 'date' },
    { name: 'budget', label: t('projects.field.budget'), type: 'number', span: 2 },
  ];

  const defaults = project
    ? {
        name: project.name,
        clientId: project.clientId,
        type: project.type,
        status: project.status,
        endDate: project.endDate ? toDateKey(project.endDate) : '',
        budget: project.budgetMinor / MINOR_UNITS_PER_RUPEE,
      }
    : { name: '', clientId: defaultClientId ?? '', type: '', status: 'ACTIVE', endDate: '', budget: '' };

  return (
    <FormDialog
      key={project?.id ?? 'new'}
      schema="project"
      title={project ? t('projects.edit') : t('projects.create.title')}
      description={project ? t('projects.edit.desc') : t('projects.create.desc')}
      submitLabel={project ? t('common.save') : t('common.create')}
      fields={fields}
      defaults={defaults}
      action={project ? updateProjectAction.bind(null, project.id) : createProjectAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
    />
  );
}
