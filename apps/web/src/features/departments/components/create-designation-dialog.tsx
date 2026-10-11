'use client';

import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { createDesignationAction } from '../actions/department.actions';

interface CreateDesignationDialogProps {
  departmentId: string;
  trigger?: ReactNode;
}

export function CreateDesignationDialog({ departmentId, trigger }: CreateDesignationDialogProps) {
  const fields: FieldDef[] = [
    { name: 'name', label: t('departments.designation.name'), required: true, span: 2 },
    { name: 'isHead', label: t('departments.designation.head'), type: 'checkbox', placeholder: t('departments.designation.head'), span: 2 },
  ];

  return (
    <FormDialog
      schema="designation"
      title={t('departments.designation.create')}
      fields={fields}
      defaults={{ name: '', isHead: false }}
      action={(values) => createDesignationAction(departmentId, values)}
      submitLabel={t('common.create')}
      trigger={trigger}
      size="sm"
    />
  );
}
