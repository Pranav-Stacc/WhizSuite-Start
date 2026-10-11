import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { Logo } from '@/shared/ui/logo';

export function MarketingFooter() {
  return (
    <footer className="marketing-footer border-t border-border-soft/80">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-8 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8 sm:py-12">
        <div className="space-y-3">
          <Logo name={t('landing.brand')} />
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
        <p className="mx-auto w-full max-w-[88rem] px-6 py-5 text-xs text-muted lg:px-8">
          {t('landing.footer', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
