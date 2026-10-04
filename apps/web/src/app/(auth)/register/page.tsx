import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { homeFor } from '@/shared/auth/roles';
import { getSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { Logo } from '@/shared/ui/logo';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = { title: 'Create workspace' };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return (
    <div className="space-y-8">
      <div className="lg:hidden">
        <Logo />
      </div>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t('auth.register.title')}</h1>
        <p className="mt-2 text-muted">{t('auth.register.subtitle')}</p>
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
