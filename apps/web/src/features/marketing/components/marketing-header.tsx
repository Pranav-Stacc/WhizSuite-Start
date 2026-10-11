'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu as MenuIcon } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Logo } from '@/shared/ui/logo';
import { Sheet } from '@/shared/ui/overlays';

const LINKS = [
  { href: '#studio', label: 'landing.nav.studio' as const },
  { href: '#craft', label: 'landing.nav.craft' as const },
  { href: '#modules', label: 'landing.nav.modules' as const },
  { href: '#stories', label: 'landing.nav.stories' as const },
  { href: '#portal', label: 'landing.nav.portal' as const },
  { href: '#faq', label: 'landing.nav.faq' as const },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-10 border-b border-border-soft/80 bg-black">
      <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8 sm:py-4">
        <Link href="/" className="min-w-0 shrink-0">
          <Logo name={t('landing.brand')} className="max-w-[12rem] sm:max-w-none [&_span]:text-base sm:[&_span]:text-[1.05rem]" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label={t('landing.nav.label')}>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {t(link.label)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/login">{t('landing.nav.signin')}</Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/register">{t('landing.cta.start')}</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('shell.menu')} onClick={() => setOpen(true)}>
            <MenuIcon />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen} title={t('landing.nav.label')} width="max-w-xs" side="left">
        <nav className="grid gap-1" aria-label={t('landing.nav.label')}>
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              {t(link.label)}
            </a>
          ))}
          <div className="mt-4 grid gap-2 border-t border-border-soft pt-4 sm:hidden">
            <Button variant="outline" asChild>
              <Link href="/login" onClick={() => setOpen(false)}>
                {t('landing.nav.signin')}
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link href="/register" onClick={() => setOpen(false)}>
                {t('landing.cta.start')}
              </Link>
            </Button>
          </div>
        </nav>
      </Sheet>
    </header>
  );
}
