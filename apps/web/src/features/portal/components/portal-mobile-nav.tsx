'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Home, LayoutGrid, LineChart, Menu as MenuIcon, MessageSquare, Receipt } from 'lucide-react';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Sheet } from '@/shared/ui/overlays';

const OPEN_EVENT = 'open-portal-menu';

const NAV: Array<{ href: string; label: MessageKey; icon: typeof Home; badgeKey?: 'approvals' | 'openInvoices' }> = [
  { href: '/portal', label: 'nav.portal.home', icon: Home },
  { href: '/portal/approvals', label: 'nav.portal.approvals', icon: CheckCircle2, badgeKey: 'approvals' },
  { href: '/portal/reports', label: 'nav.portal.reports', icon: LineChart },
  { href: '/portal/invoices', label: 'nav.portal.invoices', icon: Receipt, badgeKey: 'openInvoices' },
  { href: '/portal/files', label: 'nav.portal.files', icon: FileText },
  { href: '/portal/messages', label: 'nav.portal.messages', icon: MessageSquare },
];

const DOCK_HREFS = ['/portal', '/portal/approvals', '/portal/invoices', '/portal/messages'];

type PortalBadges = { approvals: number; openInvoices: number; messages: number };

function isActive(pathname: string, href: string): boolean {
  return href === '/portal' ? pathname === '/portal' : pathname.startsWith(href);
}

export function PortalMobileMenu({ badges }: { badges: PortalBadges }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  return (
    <>
      <Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label={t('shell.menu')} onClick={() => setOpen(true)}>
        <MenuIcon />
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={t('portal.nav')} width="max-w-sm" side="left">
        <nav className="grid gap-2" aria-label={t('portal.nav')}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const badge = item.badgeKey ? badges[item.badgeKey] : 0;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                  active ? 'border-primary/50 bg-primary/12 text-primary' : 'border-border-soft bg-surface-2/60 hover:border-border',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{t(item.label)}</span>
                {badge > 0 ? <span className="ml-auto rounded-full bg-primary px-2 text-[10px] font-bold text-primary-contrast">{badge}</span> : null}
              </Link>
            );
          })}
        </nav>
      </Sheet>
    </>
  );
}

export function PortalDesktopNav({ badges }: { badges: PortalBadges }) {
  const pathname = usePathname();
  return (
    <nav aria-label={t('portal.nav')} className="ml-auto hidden max-w-[min(100%,42rem)] items-center gap-0.5 overflow-x-auto md:flex lg:gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const badge = item.badgeKey ? badges[item.badgeKey] : 0;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition lg:px-3',
              active ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-surface-2 hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            <span className="hidden lg:inline">{t(item.label)}</span>
            <span className="sr-only lg:hidden">{t(item.label)}</span>
            {badge > 0 ? <span className="rounded-full bg-primary/16 px-1.5 text-[10px] font-semibold text-primary">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function PortalMobileDock({ badges }: { badges: PortalBadges }) {
  const pathname = usePathname();
  const dock = NAV.filter((item) => DOCK_HREFS.includes(item.href));

  return (
    <nav aria-label={t('portal.nav')} className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden print:hidden">
      <ul className="glass mx-auto flex max-w-md items-center justify-around rounded-2xl p-1.5 shadow-2xl">
        {dock.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-colors', active ? 'bg-primary/16 text-primary' : 'text-muted')}
              >
                <Icon className="size-5" />
                {t(item.label)}
                {badge > 0 ? <span className="absolute right-3 top-1 size-2 rounded-full bg-primary" /> : null}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
            className="flex w-full flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium text-muted"
          >
            <LayoutGrid className="size-5" />
            {t('shell.menu.more')}
          </button>
        </li>
      </ul>
    </nav>
  );
}
