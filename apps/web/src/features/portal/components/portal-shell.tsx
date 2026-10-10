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
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <PortalMobileMenu badges={summary} />
          <Link href="/portal" className="flex min-w-0 flex-1 items-center gap-2.5 md:flex-none" aria-label={t('portal.title')}>
            <Logo compact />
            <span className="truncate text-sm font-semibold">{session.orgName}</span>
          </Link>
          <PortalDesktopNav badges={summary} />
          <div className="ml-auto shrink-0 md:ml-0">
            <UserMenu name={session.name} email={session.email} role={session.role} orgName={session.orgName} demo={session.demo} />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-3 pb-28 pt-5 sm:px-6 sm:pt-6 md:pb-6">{children}</main>
      <PortalMobileDock badges={summary} />
    </div>
  );
}
