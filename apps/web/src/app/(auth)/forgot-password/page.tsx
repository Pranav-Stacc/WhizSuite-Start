import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';

export const metadata: Metadata = { title: t('auth.forgot.meta') };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{t('auth.forgot.meta')}</p>
        <h1 className="display mt-2 text-3xl text-foreground sm:text-[2rem]">{t('auth.forgot.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('auth.forgot.subtitle')}</p>
      </header>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="text-foreground underline-offset-2 hover:underline">
          {t('auth.forgot.back')}
        </Link>
      </p>
    </div>
  );
}
