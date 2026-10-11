import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { homeFor } from '@/shared/auth/roles';
import { getSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = { title: t('auth.register.meta') };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{t('auth.register.meta')}</p>
        <h1 className="display mt-2 text-3xl text-foreground sm:text-[2rem]">{t('auth.register.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('auth.register.subtitle')}</p>
      </header>
      <RegisterForm />
      <p className="text-center text-sm text-muted">
        {t('auth.register.haveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('auth.register.signin')}
        </Link>
      </p>
    </div>
  );
}
