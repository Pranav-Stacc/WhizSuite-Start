import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Logo } from '@/shared/ui/logo';

export function MarketingHeader() {
  return (
    <header className="relative z-10 border-b border-border-soft">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label={t('landing.nav.label')}>
          <a href="#modules" className="nav-link">
            {t('landing.nav.modules')}
          </a>
          <a href="#workflow" className="nav-link">
            {t('landing.nav.workflow')}
          </a>
          <a href="#portal" className="nav-link">
            {t('landing.nav.portal')}
          </a>
          <a href="#security" className="nav-link">
            {t('landing.nav.security')}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t('landing.nav.signin')}</Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/register">{t('landing.cta.start')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
