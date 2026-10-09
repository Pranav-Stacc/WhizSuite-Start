import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Session } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { Logo } from '@/shared/ui/logo';
import { WebPushRegistrar } from '@/features/notifications/components/web-push-registrar';
import { UserMenu } from '@/features/shell/components/shell-actions';
import { PortalDesktopNav, PortalMobileDock, PortalMobileMenu } from './portal-mobile-nav';
import { portalSummary } from '../services/portal.service';

export async function PortalShell({ session, children }: { session: Session; children: ReactNode }) {
  const summary = session.clientId ? await portalSummary(session.clientId) : { approvals: 0, openInvoices: 0, messages: 0 };

  return (
    <div className="min-h-dvh bg-background">
      <WebPushRegistrar enabled={isLiveMode} />
      <a href="#main" className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 font-medium text-primary-contrast focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('shell.skip')}
      </a>
      <header className="glass sticky top-0 z-40 border-b border-border-soft print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-2.5" aria-label={t('portal.title')}>
            <Logo compact />
            <span className="hidden text-sm font-semibold sm:inline">{session.orgName}</span>
          </Link>
          <PortalMobileMenu badges={summary} />
          <PortalDesktopNav badges={summary} />
          <UserMenu name={session.name} email={session.email} role={session.role} orgName={session.orgName} demo={session.demo} />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl animate-fade-up px-4 pb-28 pt-6 sm:px-6 md:pb-6">{children}</main>
      <PortalMobileDock badges={summary} />
    </div>
  );
}
