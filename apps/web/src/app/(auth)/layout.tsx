import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { Logo } from '@/shared/ui/logo';
import { MarketingShell } from '@/features/marketing/components/marketing-shell';

const POINTS = ['auth.hero.point1', 'auth.hero.point2', 'auth.hero.point3'] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
        <aside className="relative hidden flex-col justify-between border-r border-border-soft p-10 lg:flex xl:p-14">
          <Link href="/">
            <Logo />
          </Link>

          <div className="max-w-md">
            <h2 className="display text-balance text-3xl text-foreground xl:text-4xl">{t('auth.hero.title')}</h2>
            <p className="mt-5 text-sm leading-relaxed text-muted">{t('auth.hero.body')}</p>
            <ul className="mt-10 space-y-0 overflow-hidden rounded-lg border border-border-soft bg-surface">
              {POINTS.map((key) => (
                <li key={key} className="border-b border-border-soft px-4 py-3 text-sm text-foreground last:border-b-0">
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          <nav className="flex gap-5" aria-label={t('landing.footer.nav')}>
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

        <main id="main" className="flex items-center justify-center bg-surface/40 px-4 py-8 sm:p-10">
          <div className="card-surface w-full max-w-md animate-fade-up p-6 sm:p-8">
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
