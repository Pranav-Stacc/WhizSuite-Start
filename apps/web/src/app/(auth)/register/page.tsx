import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { homeFor } from '@/shared/auth/roles';
import { getSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { isLiveMode } from '@/shared/config/env';
import { RegisterForm } from '@/features/auth/components/register-form';
import {
  fetchAuthOAuthPublicConfig,
  resolveGoogleSignInUi,
} from '@/features/auth/utils/google-sign-in-config';

export const metadata: Metadata = { title: t('auth.register.meta') };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  const oauth = isLiveMode
    ? await fetchAuthOAuthPublicConfig().catch(() => null)
    : null;
  const google = resolveGoogleSignInUi(oauth);
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{t('auth.register.meta')}</p>
        <h1 className="display mt-2 text-3xl text-foreground sm:text-[2rem]">{t('auth.register.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('auth.register.subtitle')}</p>
      </header>
      <RegisterForm googleClientId={google.show ? google.clientId : ''} />
      <p className="text-center text-sm text-muted">
        {t('auth.register.haveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('auth.register.signin')}
        </Link>
      </p>
    </div>
  );
}
