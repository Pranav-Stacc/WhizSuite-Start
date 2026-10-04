import { Pencil } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { FormDialog, type FieldDef } from '@/shared/forms/form-dialog';
import { Button } from '@/shared/ui/button';
import { updateProfileAction } from '../actions/settings.actions';

interface ProfileFormProps {
  name: string;
  title?: string;
  defaultOpen?: boolean;
}

export function ProfileForm({ name, title, defaultOpen }: ProfileFormProps) {
  const fields: FieldDef[] = [
    { name: 'name', label: t('settings.profile.name'), placeholder: t('settings.profile.name.placeholder'), required: true, span: 2 },
    { name: 'title', label: t('settings.profile.title'), placeholder: t('settings.profile.title.placeholder'), span: 2 },
  ];

  return (
    <FormDialog
      schema="profile"
      title={t('settings.profile.edit')}
      description={t('settings.profile.edit.desc')}
      submitLabel={t('common.save')}
      fields={fields}
      defaults={{ name, title: title ?? '' }}
      action={updateProfileAction}
      defaultOpen={defaultOpen}
      trigger={
        <Button variant="secondary" size="sm">
          <Pencil />
          {t('common.edit')}
        </Button>
      }
    />
  );
}
