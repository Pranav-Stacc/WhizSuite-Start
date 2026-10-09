import { Plus } from 'lucide-react';
import { Permissions } from '@agency-os/contracts';
import { getPermissions } from '@/shared/auth/permissions';
import { FormDialog } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { createDmFormAction, createGroupFormAction } from '../actions/chat.actions';

export async function NewChatDialogs({
  memberOptions,
}: {
  memberOptions: Array<{ value: string; label: string }>;
}) {
  const granted = await getPermissions();
  if (!granted.has(Permissions.CHAT_CREATE_ROOM)) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <FormDialog
        schema="chatDm"
        title={t('chat.new.dm')}
        description={t('chat.new.dm.desc')}
        submitLabel={t('chat.new.dm.submit')}
        successMessage={t('chat.new.created')}
        size="sm"
        fields={[
          {
            name: 'userId',
            label: t('chat.new.dm.user'),
            type: 'select',
            required: true,
            options: memberOptions,
          },
        ]}
        action={createDmFormAction}
        trigger={
          <Button size="sm" variant="secondary">
            <Plus className="size-3.5" />
            {t('chat.new.dm')}
          </Button>
        }
      />
      <FormDialog
        schema="chatGroup"
        title={t('chat.new.group')}
        description={t('chat.new.group.desc')}
        submitLabel={t('chat.new.group.submit')}
        successMessage={t('chat.new.created')}
        fields={[
          {
            name: 'name',
            label: t('chat.new.group.name'),
            type: 'text',
            required: true,
            span: 2,
          },
          {
            name: 'memberUserIds',
            label: t('chat.new.group.members'),
            type: 'multiselect',
            options: memberOptions,
            span: 2,
          },
        ]}
        action={createGroupFormAction}
        trigger={
          <Button size="sm" variant="primary">
            <Plus className="size-3.5" />
            {t('chat.new.group')}
          </Button>
        }
      />
    </div>
  );
}
