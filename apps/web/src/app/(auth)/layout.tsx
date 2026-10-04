import Link from 'next/link';
import { CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { AvatarStack } from '@/shared/ui/avatar';
import { Sparkline } from '@/shared/ui/charts';
import { Logo } from '@/shared/ui/logo';

const POINTS = ['auth.hero.point1', 'auth.hero.point2', 'auth.hero.point3'] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="grid-bg relative hidden flex-col justify-between overflow-hidden border-r border-border-soft p-12 lg:flex">
        <div aria-hidden className="pointer-events-none absolute -left-24 top-1/3 size-[420px] rounded-full bg-primary/20 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute -right-16 bottom-0 size-[320px] rounded-full bg-secondary/15 blur-[110px]" />
        <Link href="/" className="relative">
          <Logo />
        </Link>

        <div className="relative max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            {t('auth.hero.eyebrow')}
          </p>
          <h2 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            <span className="text-gradient">{t('auth.hero.title')}</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted">{t('auth.hero.body')}</p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((key) => (
              <li key={key} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="size-5 text-primary" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid max-w-lg grid-cols-2 gap-4" aria-hidden>
          <div className="glass animate-float rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{t('auth.mock.revenue')}</span>
              <TrendingUp className="size-4 text-primary" />
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">₹14.6L</p>
            <Sparkline data={[4, 6, 5, 8, 7, 10, 9, 13, 12, 16]} className="mt-2" />
          </div>
          <div className="glass animate-float rounded-2xl p-4 [animation-delay:1.5s]">
            <p className="text-xs text-muted">{t('auth.mock.approvedNow')}</p>
            <p className="mt-1 text-sm font-medium">{t('auth.mock.post')}</p>
            <div className="mt-3 flex items-center justify-between">
              <AvatarStack names={['Neha Kapoor', 'Rohan Das', 'Priya Nair']} size="sm" />
              <span className="rounded-full bg-success/14 px-2 py-0.5 text-[11px] font-medium text-success">{t('auth.mock.approved')}</span>
            </div>
          </div>
        </div>
      </aside>
      <main id="main" className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-xl animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
