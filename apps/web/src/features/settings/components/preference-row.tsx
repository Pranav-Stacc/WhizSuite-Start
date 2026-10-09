import type { NotificationTypeKey } from '@agency-os/contracts';
import { t, type MessageKey } from '@/shared/i18n/t';
import { Toggle } from '@/shared/ui/toggle';
import { updatePreferenceAction } from '../actions/settings.actions';

interface PreferenceRowProps {
  typeKey: NotificationTypeKey;
  enabled: boolean;
}

export function PreferenceRow({ typeKey, enabled }: PreferenceRowProps) {
  const label = t(`settings.pref.${typeKey}` as MessageKey);
  const hint = t(`settings.pref.${typeKey}.hint` as MessageKey);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-soft py-4 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-[13px] text-muted">{hint}</p>
      </div>
      <Toggle checked={enabled} label={label} action={updatePreferenceAction.bind(null, typeKey)} />
    </div>
  );
}
