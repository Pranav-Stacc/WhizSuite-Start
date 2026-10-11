import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

export const metadata: Metadata = { title: t('auth.reset.meta') };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const token = param(await searchParams, 'token') ?? '';
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{t('auth.reset.meta')}</p>
        <h1 className="display mt-2 text-3xl text-foreground sm:text-[2rem]">{t('auth.reset.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('auth.reset.subtitle')}</p>
      </header>
      <ResetPasswordForm token={token} />
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="text-foreground underline-offset-2 hover:underline">
          {t('auth.forgot.back')}
        </Link>
      </p>
    </div>
  );
}
