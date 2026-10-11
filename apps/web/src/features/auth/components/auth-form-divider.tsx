import { t } from '@/shared/i18n/t';

type AuthFormDividerProps = {
  labelKey?: 'auth.login.orGoogle' | 'auth.login.or';
};

export function AuthFormDivider({ labelKey = 'auth.login.orGoogle' }: AuthFormDividerProps) {
  return (
    <div
      className="relative py-1 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-border-soft/80"
      role="separator"
    >
      <span className="auth-divider-label relative px-3">{t(labelKey)}</span>
    </div>
  );
}
