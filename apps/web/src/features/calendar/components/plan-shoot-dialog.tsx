'use client';

import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { createShootAction } from '../actions/shoot.actions';

interface PlanShootDialogProps {
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; clientId: string }>;
  defaultClientId?: string;
  defaultStartsAt?: string;
  googleConnected?: boolean;
  defaultSyncToGoogle?: boolean;
  trigger: ReactNode;
}

export function PlanShootDialog({
  clients,
  projects,
  defaultClientId,
  defaultStartsAt,
  googleConnected = false,
  defaultSyncToGoogle = false,
  trigger,
}: PlanShootDialogProps) {
  const fields: FieldDef[] = [
    { name: 'title', label: t('calendar.shoot.title'), required: true, span: 2 },
    {
      name: 'clientId',
      label: t('calendar.shoot.client'),
      type: 'select',
      required: true,
      span: 1,
      options: clients.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: 'projectId',
      label: t('calendar.shoot.project'),
      type: 'select',
      span: 1,
      options: [
        { value: '', label: t('common.none') },
        ...projects.map((p) => ({ value: p.id, label: p.name })),
      ],
      hint: t('calendar.shoot.projectHint'),
    },
    { name: 'startsAt', label: t('calendar.shoot.startsAt'), type: 'datetime-local', required: true, span: 1 },
    { name: 'endsAt', label: t('calendar.shoot.endsAt'), type: 'datetime-local', span: 1 },
    {
      name: 'createFolders',
      label: t('calendar.shoot.createFolders'),
      type: 'checkbox',
      span: 2,
      hint: t('calendar.shoot.createFoldersHint'),
    },
    {
      name: 'taskTitles',
      label: t('calendar.shoot.tasks'),
      type: 'textarea',
      span: 2,
      hint: t('calendar.shoot.tasksHint'),
      rows: 3,
    },
  ];

  if (googleConnected) {
    fields.push({
      name: 'syncToGoogle',
      label: t('calendar.sync.optIn'),
      type: 'checkbox',
      span: 2,
      hint: t('calendar.sync.optInHint'),
    });
  }

  return (
    <FormDialog
      size="sm"
      schema="shoot"
      title={t('calendar.shoot.heading')}
      description={t('calendar.shoot.desc')}
      submitLabel={t('calendar.shoot.submit')}
      fields={fields}
      defaults={{
        clientId: defaultClientId ?? clients[0]?.id ?? '',
        createFolders: true,
        allDay: true,
        startsAt: defaultStartsAt ?? new Date().toISOString().slice(0, 16),
        syncToGoogle: defaultSyncToGoogle,
      }}
      action={createShootAction}
      trigger={trigger}
    />
  );
}
