import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BarChart3, Bot, Building2, CalendarCheck2, Crown, PenTool, ScrollText, SquarePen, UserCog, type LucideIcon } from 'lucide-react';
import { homeFor } from '@/shared/auth/roles';
import { getSession } from '@/shared/auth/session';
import { t, type MessageKey } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Logo } from '@/shared/ui/logo';
import { Badge } from '@/shared/ui/badge';

const FEATURES: Array<{ icon: LucideIcon; title: MessageKey; body: MessageKey }> = [
  { icon: CalendarCheck2, title: 'landing.f1.title', body: 'landing.f1.body' },
  { icon: SquarePen, title: 'landing.f2.title', body: 'landing.f2.body' },
  { icon: Building2, title: 'landing.f3.title', body: 'landing.f3.body' },
  { icon: Bot, title: 'landing.f4.title', body: 'landing.f4.body' },
  { icon: BarChart3, title: 'landing.f5.title', body: 'landing.f5.body' },
  { icon: ScrollText, title: 'landing.f6.title', body: 'landing.f6.body' },
];

const ROLES: Array<{ icon: LucideIcon; title: MessageKey; body: MessageKey }> = [
  { icon: Crown, title: 'auth.persona.owner.title', body: 'auth.persona.owner.blurb' },
  { icon: UserCog, title: 'auth.persona.manager.title', body: 'auth.persona.manager.blurb' },
  { icon: PenTool, title: 'auth.persona.creator.title', body: 'auth.persona.creator.blurb' },
  { icon: Building2, title: 'auth.persona.client.title', body: 'auth.persona.client.blurb' },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));

  return (
    <div className="grid-bg relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 size-[720px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/18 blur-[140px]" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2" aria-label={t('landing.nav.label')}>
          <Button variant="ghost" asChild>
            <Link href="/login">{t('landing.nav.signin')}</Link>
          </Button>
          <Button variant="primary" asChild>
            <Link href="/register">{t('landing.cta.start')}</Link>
          </Button>
        </nav>
      </header>

      <main id="main" className="relative">
        <section className="mx-auto max-w-7xl px-6 pb-20 pt-14 text-center sm:pt-24">
          <Badge tone="primary" className="mb-6 px-3.5 py-1 text-[13px]">
            {t('landing.badge')}
          </Badge>
          <h1 className="mx-auto max-w-4xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            <span className="text-gradient">{t('landing.title')}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">{t('landing.subtitle')}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" size="lg" asChild>
              <Link href="/register">
                {t('landing.cta.start')}
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">{t('landing.cta.demo')}</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">{t('landing.features.title')}</h2>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="card-surface card-hover p-6">
                <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{t(title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(body)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('landing.roles.title')}</h2>
            <p className="mt-3 text-muted">{t('landing.roles.subtitle')}</p>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="card-surface p-6">
                <Icon className="mb-4 size-6 text-primary" />
                <h3 className="font-semibold">{t(title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(body)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight">{t('landing.final.title')}</h2>
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="primary" size="lg" asChild>
              <Link href="/register">{t('landing.cta.start')}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">{t('landing.cta.demo')}</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border-soft py-8 text-center text-sm text-muted">{t('landing.footer')}</footer>
    </div>
  );
}
