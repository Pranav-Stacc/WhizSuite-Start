'use client';

import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { createDepartmentAction } from '../actions/department.actions';
import type { Department } from '../data/departments.repository';

export function CreateDepartmentDialog({ departments, trigger }: { departments: Department[]; trigger?: ReactNode }) {
  const fields: FieldDef[] = [
    { name: 'name', label: t('departments.name'), type: 'text', required: true, span: 2 },
    {
      name: 'parentId',
      label: t('departments.parent'),
      type: 'select',
      options: [{ value: '', label: t('departments.parent.none') }, ...departments.map((d) => ({ value: d.id, label: d.name }))],
    },
  ];

  return (
    <FormDialog
      schema="department"
      title={t('departments.create.heading')}
      description={t('departments.create.desc')}
      submitLabel={t('departments.create.submit')}
      fields={fields}
      defaults={{ name: '', parentId: '' }}
      action={createDepartmentAction}
      trigger={trigger}
    />
  );
}
