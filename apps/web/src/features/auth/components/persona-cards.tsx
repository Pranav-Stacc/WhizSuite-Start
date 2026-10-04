import { ArrowRight, Building2, Crown, PenTool, UserCog, type LucideIcon } from 'lucide-react';
import { UserRoles, type UserRole } from '@agency-os/contracts';
import { PERSONAS } from '@/shared/auth/roles';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/avatar';
import { enterAsPersonaAction } from '../actions/auth.actions';

const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  [UserRoles.OWNER]: Crown,
  [UserRoles.MANAGER]: UserCog,
  [UserRoles.CREATOR]: PenTool,
  [UserRoles.CLIENT]: Building2,
};

/** One-click demo entry per role. Each card is a plain form posting to a server action — works without JavaScript. */
export function PersonaCards({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {PERSONAS.map((persona) => {
        const Icon = ROLE_ICONS[persona.role];
        return (
          <form key={persona.role} action={enterAsPersonaAction.bind(null, persona.role)}>
            <button
              type="submit"
              className="group relative flex h-full w-full flex-col gap-3 rounded-2xl border border-border-soft bg-surface-2/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-2 hover:shadow-[0_12px_40px_-16px_var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/14 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{t(persona.titleKey)}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted">{t(persona.blurbKey)}</span>
              </span>
              <span className="mt-auto flex items-center gap-2 text-xs text-muted">
                <Avatar name={persona.name} size="xs" />
                {persona.name}
              </span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
