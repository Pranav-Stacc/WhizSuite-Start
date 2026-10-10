'use client';

import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { createCalendarEventAction } from '../actions/calendar.actions';

interface CreateEventDialogProps {
  clients: Array<{ id: string; name: string }>;
  defaultClientId?: string;
  defaultStartsAt: string;
  googleConnected: boolean;
  defaultSyncToGoogle: boolean;
  trigger: ReactNode;
}

export function CreateEventDialog({
  clients,
  defaultClientId,
  defaultStartsAt,
  googleConnected,
  defaultSyncToGoogle,
  trigger,
}: CreateEventDialogProps) {
  const fields: FieldDef[] = [
    { name: 'title', label: t('calendar.event.title'), required: true, span: 2 },
    {
      name: 'sourceType',
      label: t('calendar.event.type'),
      type: 'select',
      required: true,
      span: 1,
      options: [
        { value: 'MANUAL', label: t('calendar.legend.manual') },
        { value: 'MEETING', label: t('calendar.legend.meetings') },
        { value: 'DEADLINE', label: t('calendar.legend.deadlines') },
      ],
    },
    {
      name: 'clientId',
      label: t('calendar.shoot.client'),
      type: 'select',
      span: 1,
      options: [
        { value: '', label: t('common.none') },
        ...clients.map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    { name: 'startsAt', label: t('calendar.shoot.startsAt'), type: 'datetime-local', required: true, span: 1 },
    { name: 'endsAt', label: t('calendar.shoot.endsAt'), type: 'datetime-local', span: 1 },
    {
      name: 'allDay',
      label: t('calendar.event.allDay'),
      type: 'checkbox',
      span: 2,
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
      schema="calendarEvent"
      title={t('calendar.event.heading')}
      description={t('calendar.event.desc')}
      submitLabel={t('calendar.event.submit')}
      fields={fields}
      defaults={{
        sourceType: 'MANUAL',
        clientId: defaultClientId ?? '',
        startsAt: defaultStartsAt,
        allDay: false,
        syncToGoogle: defaultSyncToGoogle,
      }}
      action={createCalendarEventAction}
      trigger={trigger}
      successMessage={t('calendar.event.created')}
    />
  );
}
