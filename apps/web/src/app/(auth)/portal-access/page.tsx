import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { Logo } from '@/shared/ui/logo';
import { PortalAccessForm } from '@/features/auth/components/portal-access-form';
import { fetchPortalAccessPreview } from '@/features/auth/data/invitations.api';

export const metadata: Metadata = { title: t('auth.portalAccess.meta') };

interface PortalAccessPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function PortalAccessPage({ searchParams }: PortalAccessPageProps) {
  const { token = '' } = await searchParams;
  const preview = await fetchPortalAccessPreview(token);

  return (
    <div className="space-y-8">
      <div className="lg:hidden">
        <Logo />
      </div>
      {preview ? (
        <>
          <header>
            <h1 className="text-3xl font-semibold tracking-tight" suppressHydrationWarning>
              {t('auth.portalAccess.title', {
                client: preview.clientName ?? preview.organizationName,
              })}
            </h1>
            <p className="mt-2 text-muted" suppressHydrationWarning>
              {t('auth.portalAccess.subtitle', { organization: preview.organizationName })}
            </p>
          </header>
          <PortalAccessForm
            token={token}
            passwordRequired={preview.passwordRequired}
            organizationName={preview.organizationName}
            clientName={preview.clientName}
            accessMode={preview.accessMode}
            membershipTtlHours={preview.membershipTtlHours}
            appStoreUrl={preview.appStoreUrl}
            playStoreUrl={preview.playStoreUrl}
          />
        </>
      ) : (
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">{t('auth.portalAccess.invalidTitle')}</h1>
          <p role="alert" className="mt-2 text-muted">
            {t('auth.portalAccess.invalid')}
          </p>
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
