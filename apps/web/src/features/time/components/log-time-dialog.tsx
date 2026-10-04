import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/t';
import { toDateKey } from '@/shared/lib/format';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { logTimeAction } from '../actions/time.actions';

interface LogTimeDialogProps {
  projects: Array<{ id: string; label: string }>;
  trigger: ReactNode;
  defaultOpen?: boolean;
}

export function LogTimeDialog({ projects, trigger, defaultOpen }: LogTimeDialogProps) {
  const fields: FieldDef[] = [
    { name: 'projectId', label: t('time.field.project'), type: 'select', required: true, options: projects.map((p) => ({ value: p.id, label: p.label })), span: 2 },
    { name: 'minutes', label: t('time.field.minutes'), type: 'number', required: true },
    { name: 'date', label: t('time.field.date'), type: 'date', required: true },
    { name: 'note', label: t('time.field.note'), type: 'textarea', rows: 2, span: 2 },
  ];
  return (
    <FormDialog
      schema="time"
      size="sm"
      title={t('time.log.title')}
      description={t('time.log.desc')}
      submitLabel={t('time.log')}
      fields={fields}
      defaults={{ projectId: '', minutes: '', date: toDateKey(new Date()), note: '' }}
      action={logTimeAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
    />
  );
}
