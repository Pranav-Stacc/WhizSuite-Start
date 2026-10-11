import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DEMO_PASSWORD, homeFor } from '@/shared/auth/roles';
import { getSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { PersonaCards } from '@/features/auth/components/persona-cards';
import { LoginForm } from '@/features/auth/components/login-form';
import { param, type SearchParams } from '@/shared/ui/nav-controls';

export const metadata: Metadata = { title: t('auth.login.meta') };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  const query = await searchParams;
  const expired = param(query, 'expired') === '1';

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{t('auth.login.meta')}</p>
        <h1 className="display mt-2 text-3xl text-foreground sm:text-[2rem]">{t('auth.login.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('auth.login.subtitle')}</p>
        {expired ? (
          <p role="status" className="mt-4 rounded-lg bg-warning/12 px-3 py-2 text-sm text-warning">
            {t('auth.login.expired')}
          </p>
        ) : null}
      </header>

      {isLiveMode ? null : (
        <section aria-labelledby="demo-title" className="space-y-3">
          <div>
            <h2 id="demo-title" className="text-sm font-semibold">
              {t('auth.demo.title')}
            </h2>
            <p className="text-[13px] text-muted">{t('auth.demo.subtitle')}</p>
          </div>
          <PersonaCards />
          <div className="relative py-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-border-soft/80">
            <span className="auth-divider-label relative px-3">{t('auth.login.or')}</span>
          </div>
        </section>
      )}

      <LoginForm defaultEmail={isLiveMode ? undefined : 'owner@pixelforge.agency'} />
      {isLiveMode ? null : <p className="text-center text-xs text-muted">{t('auth.demo.hint', { password: DEMO_PASSWORD })}</p>}

      <p className="text-center text-sm text-muted">
        {t('auth.login.noAccount')}{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t('auth.login.register')}
        </Link>
      </p>
    </div>
  );
}
