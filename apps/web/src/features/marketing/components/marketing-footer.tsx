import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { Logo } from '@/shared/ui/logo';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted">{t('landing.footer.tagline')}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label={t('landing.footer.nav')}>
          <Link href="/login" className="nav-link">
            {t('landing.nav.signin')}
          </Link>
          <Link href="/register" className="nav-link">
            {t('landing.cta.start')}
          </Link>
          <Link href="/privacy" className="nav-link">
            {t('legal.privacy.nav')}
          </Link>
          <Link href="/terms" className="nav-link">
            {t('legal.terms.nav')}
          </Link>
          <Link href="/data-deletion" className="nav-link">
            {t('legal.dataDeletion.nav')}
          </Link>
        </nav>
      </div>
      <div className="border-t border-border-soft">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-muted">
          {t('landing.footer', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
