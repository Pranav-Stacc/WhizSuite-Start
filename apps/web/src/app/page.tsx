import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { homeFor } from '@/shared/auth/roles';
import { getSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { MarketingFooter } from '@/features/marketing/components/marketing-footer';
import { MarketingHeader } from '@/features/marketing/components/marketing-header';
import { MarketingShell } from '@/features/marketing/components/marketing-shell';
import { LandingHome } from '@/features/marketing/components/landing-home';

export const metadata: Metadata = {
  title: t('app.name'),
  description: t('landing.subtitle'),
};

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));

  return (
    <MarketingShell landing>
      <MarketingHeader />
      <LandingHome />
      <MarketingFooter />
    </MarketingShell>
  );
}
