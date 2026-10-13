import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { AcceptInvitationForm } from '@/features/auth/components/accept-invitation-form';
import { fetchInvitationPreview } from '@/features/auth/data/invitations.api';

export const metadata: Metadata = { title: t('auth.invite.meta') };

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token = '' } = await searchParams;
  const preview = await fetchInvitationPreview(token);

  return (
    <div className="space-y-8">
      {preview ? (
        <>
          <header>
            <h1 className="text-3xl font-semibold tracking-tight">{t('auth.invite.title', { organization: preview.organizationName })}</h1>
            <p className="mt-2 text-muted">
              {preview.hasAccount
                ? t('auth.invite.subtitleExisting', { email: preview.email })
                : t('auth.invite.subtitle', { email: preview.email })}{' '}
              {t('auth.invite.setPasswordHint')}
            </p>
          </header>
          <AcceptInvitationForm token={token} email={preview.email} hasAccount={preview.hasAccount} />
        </>
      ) : (
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">{t('auth.invite.invalidTitle')}</h1>
          <p role="alert" className="mt-2 text-muted">{t('auth.invite.invalid')}</p>
        </header>
      )}
      <p className="text-center text-sm text-muted">
        {t('auth.register.haveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('auth.register.signin')}
        </Link>
      </p>
    </div>
  );
}
