import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { homeFor } from '@/shared/auth/roles';
import { getSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { MarketingFooter } from '@/features/marketing/components/marketing-footer';
import { MarketingHeader } from '@/features/marketing/components/marketing-header';
import { MarketingShell } from '@/features/marketing/components/marketing-shell';
import { ProductFrame } from '@/features/marketing/components/product-frame';
import { Logo } from '@/shared/ui/logo';

export const metadata: Metadata = {
  title: t('app.name'),
  description: t('landing.subtitle'),
};

const MODULES = [
  { title: 'landing.m1.title', body: 'landing.m1.body' },
  { title: 'landing.m2.title', body: 'landing.m2.body' },
  { title: 'landing.m3.title', body: 'landing.m3.body' },
  { title: 'landing.m4.title', body: 'landing.m4.body' },
  { title: 'landing.m5.title', body: 'landing.m5.body' },
  { title: 'landing.m6.title', body: 'landing.m6.body' },
] as const;

const WORKFLOW_STEPS = [
  'landing.workflow.step1',
  'landing.workflow.step2',
  'landing.workflow.step3',
  'landing.workflow.step4',
  'landing.workflow.step5',
  'landing.workflow.step6',
] as const;

const PORTAL_POINTS = ['landing.portal.b1', 'landing.portal.b2', 'landing.portal.b3'] as const;

const SECURITY = [
  { title: 'landing.security.b1.title', body: 'landing.security.b1.body' },
  { title: 'landing.security.b2.title', body: 'landing.security.b2.body' },
  { title: 'landing.security.b3.title', body: 'landing.security.b3.body' },
] as const;

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));

  return (
    <MarketingShell>
      <MarketingHeader />

      <main id="main">
        {/* Hero: brand + one line + CTA + product plane */}
        <section className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-end lg:gap-16 lg:pb-28 lg:pt-20">
          <div className="marketing-rise max-w-xl">
            <div className="mb-6 sm:mb-8">
              <Logo />
            </div>
            <h1 className="display text-balance text-[2rem] leading-tight text-foreground sm:text-5xl lg:text-[3.35rem]">
              {t('landing.title')}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">{t('landing.subtitle')}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
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
          </div>
          <div className="marketing-rise marketing-rise-delay-2">
            <p className="eyebrow mb-3">{t('landing.hero.aside')}</p>
            <ProductFrame />
          </div>
        </section>

        <div className="marketing-rule mx-auto max-w-6xl" aria-hidden />

        {/* Modules */}
        <section id="modules" className="marketing-stage mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">{t('landing.modules.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.modules.title')}</h2>
            <p className="mt-4 text-muted">{t('landing.modules.body')}</p>
          </div>
          <ul className="mt-14 grid gap-px border border-border-soft bg-border-soft sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ title, body }, index) => (
              <li key={title} className="bg-background p-6">
                <p className="font-mono text-[11px] tracking-[0.18em] text-muted">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 text-lg text-foreground">{t(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(body)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Workflow */}
        <section id="workflow" className="marketing-stage border-t border-border-soft bg-surface/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
            <div className="max-w-2xl">
              <p className="eyebrow">{t('landing.workflow.eyebrow')}</p>
              <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.workflow.title')}</h2>
              <p className="mt-4 text-muted">{t('landing.workflow.body')}</p>
            </div>
            <ol className="mt-14 flex flex-col gap-0 border border-border-soft lg:flex-row">
              {WORKFLOW_STEPS.map((key, index) => (
                <li
                  key={key}
                  className="flex flex-1 items-center gap-3 border-border-soft px-4 py-4 lg:border-r lg:last:border-r-0 border-b last:border-b-0 lg:border-b-0"
                >
                  <span className="font-mono text-[11px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-sm text-foreground">{t(key)}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Portal */}
        <section id="portal" className="marketing-stage mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="eyebrow">{t('landing.portal.eyebrow')}</p>
              <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.portal.title')}</h2>
              <p className="mt-4 max-w-xl text-muted">{t('landing.portal.body')}</p>
            </div>
            <ul className="space-y-0 border border-border-soft">
              {PORTAL_POINTS.map((key) => (
                <li key={key} className="border-b border-border-soft px-5 py-4 text-sm text-foreground last:border-b-0">
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="marketing-stage border-t border-border-soft">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
            <div className="max-w-2xl">
              <p className="eyebrow">{t('landing.security.eyebrow')}</p>
              <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.security.title')}</h2>
              <p className="mt-4 text-muted">{t('landing.security.body')}</p>
            </div>
            <ul className="mt-14 grid gap-px bg-border-soft sm:grid-cols-3">
              {SECURITY.map(({ title, body }) => (
                <li key={title} className="bg-background p-6">
                  <h3 className="text-base text-foreground">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(body)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="marketing-stage border-t border-border-soft">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h2 className="display text-3xl text-foreground sm:text-4xl">{t('landing.final.title')}</h2>
              <p className="mt-4 text-muted">{t('landing.final.body')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="lg" asChild>
                <Link href="/register">{t('landing.cta.start')}</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">{t('landing.cta.signin')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </MarketingShell>
  );
}
