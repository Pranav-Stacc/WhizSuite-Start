import type { ReactNode } from 'react';
import { AssetKinds } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { createAssetAction } from '../actions/media.actions';

interface AssetDialogProps {
  clients: Array<{ id: string; name: string }>;
  trigger: ReactNode;
  defaultOpen?: boolean;
  defaultClientId?: string;
}

export function AssetDialog({ clients, trigger, defaultOpen, defaultClientId }: AssetDialogProps) {
  const fields: FieldDef[] = [
    { name: 'name', label: t('media.field.name'), placeholder: t('media.field.name.placeholder'), required: true, span: 2 },
    { name: 'clientId', label: t('media.field.client'), type: 'select', required: true, options: clients.map((c) => ({ value: c.id, label: c.name })) },
    { name: 'kind', label: t('media.field.kind'), type: 'select', required: true, options: AssetKinds.map((k) => ({ value: k, label: t(`media.kind.${k}`) })) },
    { name: 'tags', label: t('media.field.tags'), hint: t('media.field.tags.hint'), span: 2 },
  ];
  return (
    <FormDialog
      schema="asset"
      size="sm"
      title={t('media.add.title')}
      description={t('media.add.desc')}
      submitLabel={t('media.add')}
      fields={fields}
      defaults={{ name: '', clientId: defaultClientId ?? '', kind: 'image', tags: '' }}
      action={createAssetAction}
      trigger={trigger}
      defaultOpen={defaultOpen}
    />
  );
}
