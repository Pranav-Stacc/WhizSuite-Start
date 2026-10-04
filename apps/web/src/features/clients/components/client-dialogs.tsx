import type { ReactNode } from 'react';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { createClientAction, updateBrandKitAction } from '../actions/client.actions';
import type { Client } from '../data/clients.repository';

export function ClientDialog({ trigger, defaultOpen }: { trigger?: ReactNode; defaultOpen?: boolean }) {
  const fields: FieldDef[] = [
    { name: 'displayName', label: t('clients.field.name'), placeholder: t('clients.field.name.placeholder'), required: true, span: 2 },
    { name: 'industry', label: t('clients.field.industry') },
    { name: 'website', label: t('clients.field.website') },
    { name: 'contactName', label: t('clients.field.contactName') },
    { name: 'contactEmail', label: t('clients.field.contactEmail'), type: 'email' },
    { name: 'tier', label: t('clients.field.tier'), placeholder: t('clients.field.tier.placeholder'), span: 2 },
  ];
  return (
    <FormDialog
      schema="client"
      title={t('clients.create.title')}
      description={t('clients.create.desc')}
      submitLabel={t('clients.new')}
      fields={fields}
      defaults={{ displayName: '', industry: '', website: '', contactName: '', contactEmail: '', tier: '' }}
      action={createClientAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
    />
  );
}

export function BrandKitDialog({ client, trigger }: { client: Client; trigger: ReactNode }) {
  const fields: FieldDef[] = [
    { name: 'primary', label: t('clients.brand.primary'), type: 'color', required: true },
    { name: 'secondary', label: t('clients.brand.secondary'), type: 'color', required: true },
    { name: 'accent', label: t('clients.brand.accent'), type: 'color', required: true },
    { name: 'voice', label: t('clients.brand.voice'), type: 'textarea', rows: 3, placeholder: t('clients.brand.voice.placeholder'), span: 2 },
    { name: 'hashtags', label: t('clients.brand.hashtags'), hint: t('clients.brand.hashtags.hint'), span: 2 },
    { name: 'pillars', label: t('clients.brand.pillars'), hint: t('clients.brand.pillars.hint'), span: 2 },
  ];
  return (
    <FormDialog
      schema="brandKit"
      title={t('clients.brand.edit')}
      description={t('clients.brand.edit.desc')}
      submitLabel={t('common.save')}
      fields={fields}
      defaults={{
        primary: client.brand.primary,
        secondary: client.brand.secondary,
        accent: client.brand.accent,
        voice: client.brand.voice,
        hashtags: client.brand.hashtags.join(' '),
        pillars: client.brand.pillars.join(', '),
      }}
      action={updateBrandKitAction.bind(null, client.id)}
      trigger={trigger}
    />
  );
}
