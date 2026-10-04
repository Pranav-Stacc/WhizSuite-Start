import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/t';
import { toDateKey } from '@/shared/lib/format';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { ActionButton } from '@/shared/ui/action-button';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import type { Member } from '@/features/team/data/members.repository';
import { convertLeadAction, createLeadAction, deleteLeadAction, updateLeadAction } from '../actions/lead.actions';
import type { Lead } from '../data/leads.repository';

const MINOR_UNITS_PER_MAJOR = 100;

interface LeadDialogProps {
  members: Array<Pick<Member, 'id' | 'name'>>;
  lead?: Lead;
  trigger?: ReactNode;
  defaultOpen?: boolean;
}

export function LeadDialog({ members, lead, trigger, defaultOpen }: LeadDialogProps) {
  const fields: FieldDef[] = [
    { name: 'companyName', label: t('leads.field.company'), placeholder: t('leads.field.company.placeholder'), required: true, span: 2 },
    { name: 'contactName', label: t('leads.field.contact') },
    { name: 'contactEmail', label: t('leads.field.email'), type: 'email' },
    { name: 'industry', label: t('leads.field.industry') },
    { name: 'source', label: t('leads.field.source'), placeholder: t('leads.field.source.placeholder') },
    { name: 'estimatedValue', label: t('leads.field.value'), type: 'number', hint: t('leads.field.value.hint') },
    { name: 'ownerId', label: t('leads.field.owner'), type: 'select', options: members.map((m) => ({ value: m.id, label: m.name })) },
    { name: 'nextStep', label: t('leads.field.nextStep'), placeholder: t('leads.field.nextStep.placeholder') },
    { name: 'nextStepAt', label: t('leads.field.nextStepAt'), type: 'date' },
    { name: 'website', label: t('leads.field.website'), span: 2 },
  ];

  const defaults = lead
    ? {
        companyName: lead.company,
        contactName: lead.contact,
        contactEmail: lead.email,
        industry: lead.industry,
        source: lead.source,
        estimatedValue: lead.valueMinor / MINOR_UNITS_PER_MAJOR,
        ownerId: lead.ownerId,
        nextStep: lead.nextStep,
        nextStepAt: lead.nextStepAt ? toDateKey(lead.nextStepAt) : '',
        website: lead.website ?? '',
      }
    : { companyName: '', contactName: '', contactEmail: '', industry: '', source: '', estimatedValue: '', ownerId: '', nextStep: '', nextStepAt: '', website: '' };

  const canConvert = lead && !lead.convertedClientId && lead.stage !== 'LOST';

  return (
    <FormDialog
      key={lead?.id ?? 'new'}
      schema="lead"
      title={lead ? lead.company : t('leads.create.title')}
      description={lead ? t('leads.edit.desc') : t('leads.create.desc')}
      submitLabel={lead ? t('common.save') : t('common.create')}
      fields={fields}
      defaults={defaults}
      action={lead ? updateLeadAction.bind(null, lead.id) : createLeadAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
      footerExtra={
        lead ? (
          <span className="inline-flex items-center gap-2">
            <ConfirmButton action={deleteLeadAction.bind(null, lead.id)} label={t('leads.delete')} />
            {canConvert ? <ActionButton action={convertLeadAction.bind(null, lead.id)} label={t('leads.convert')} variant="secondary" /> : null}
          </span>
        ) : undefined
      }
    />
  );
}
