import Link from 'next/link';
import type { ReactNode } from 'react';
import { CheckCircle2, FileText, Home, LineChart, MessageSquare, Receipt } from 'lucide-react';
import type { Session } from '@/shared/auth/session';
import { t, type MessageKey } from '@/shared/i18n/t';
import { Logo } from '@/shared/ui/logo';
import { UserMenu } from '@/features/shell/components/shell-actions';
import { portalSummary } from '../services/portal.service';

const NAV: Array<{ href: string; label: MessageKey; icon: typeof Home; badgeKey?: 'approvals' | 'openInvoices' }> = [
  { href: '/portal', label: 'nav.portal.home', icon: Home },
  { href: '/portal/approvals', label: 'nav.portal.approvals', icon: CheckCircle2, badgeKey: 'approvals' },
  { href: '/portal/reports', label: 'nav.portal.reports', icon: LineChart },
  { href: '/portal/invoices', label: 'nav.portal.invoices', icon: Receipt, badgeKey: 'openInvoices' },
  { href: '/portal/files', label: 'nav.portal.files', icon: FileText },
  { href: '/portal/messages', label: 'nav.portal.messages', icon: MessageSquare },
];

export async function PortalShell({ session, children }: { session: Session; children: ReactNode }) {
  const summary = session.clientId ? await portalSummary(session.clientId) : { approvals: 0, openInvoices: 0, messages: 0 };

  return (
    <div className="min-h-dvh bg-background">
      <header className="glass sticky top-0 z-40 border-b border-border-soft print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-2.5" aria-label={t('portal.title')}>
            <Logo compact />
            <span className="hidden text-sm font-semibold sm:inline">{session.orgName}</span>
          </Link>
          <nav aria-label={t('portal.nav')} className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              const badge = item.badgeKey ? summary[item.badgeKey] : 0;
              return (
                <Link key={item.href} href={item.href} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition hover:bg-surface-2 hover:text-foreground">
                  <Icon className="size-4" />
                  {t(item.label)}
                  {badge > 0 ? <span className="rounded-full bg-primary/16 px-1.5 text-[10px] font-semibold text-primary">{badge}</span> : null}
                </Link>
              );
            })}
          </nav>
          <UserMenu name={session.name} email={session.email} role={session.role} orgName={session.orgName} demo={session.demo} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl animate-fade-up px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
