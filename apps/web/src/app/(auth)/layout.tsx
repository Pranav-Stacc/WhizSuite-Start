import Link from 'next/link';
import { Check } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Logo } from '@/shared/ui/logo';
import { MarketingShell } from '@/features/marketing/components/marketing-shell';

const POINTS = ['auth.hero.point1', 'auth.hero.point2', 'auth.hero.point3'] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell landing>
      <div className="relative grid min-h-dvh lg:grid-cols-[1fr_1fr]">
        <aside className="relative hidden flex-col justify-between border-r border-border-soft/60 p-10 lg:flex xl:p-14">
          <Link href="/" className="relative z-[1]">
            <Logo />
          </Link>

          <div className="relative z-[1] max-w-md">
            <p className="eyebrow">{t('landing.brand')}</p>
            <h2 className="display mt-3 text-balance text-3xl text-foreground xl:text-4xl">
              {t('auth.hero.title')}
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted">{t('auth.hero.body')}</p>
            <ul className="mt-10 space-y-3">
              {POINTS.map((key) => (
                <li key={key} className="flex gap-3 text-sm text-foreground/90">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-foreground/20 bg-foreground/5">
                    <Check className="size-3 text-foreground/80" aria-hidden />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          <nav className="relative z-[1] flex gap-5" aria-label={t('landing.footer.nav')}>
            <Link href="/privacy" className="nav-link">
              {t('legal.privacy.nav')}
            </Link>
            <Link href="/data-deletion" className="nav-link">
              {t('legal.dataDeletion.nav')}
            </Link>
            <Link href="/terms" className="nav-link">
              {t('legal.terms.nav')}
            </Link>
          </nav>
        </aside>

        <main id="main" className="relative flex items-center justify-center px-4 py-10 sm:p-10">
          <div className="auth-panel w-full max-w-md animate-fade-up p-6 sm:p-8">
            <Link href="/" className="mb-8 inline-block lg:hidden">
              <Logo />
            </Link>
            {children}
          </div>
        </main>
      </div>
    </MarketingShell>
  );
}
