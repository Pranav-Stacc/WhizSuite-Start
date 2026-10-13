'use client';

import { deleteDesignationAction } from '@/features/departments/actions/department.actions';
import { t } from '@/shared/i18n/t';
import { ConfirmButton } from '@/shared/ui/confirm-button';

export function DesignationDeleteButton({ designationId }: { designationId: string }) {
  return (
    <ConfirmButton
      action={() => deleteDesignationAction(designationId)}
      label={t('common.delete')}
      size="sm"
      variant="ghost"
    />
  );
}
