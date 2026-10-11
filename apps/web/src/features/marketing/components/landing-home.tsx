import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  FileCheck,
  Inbox,
  Layers,
  Lock,
  MessageSquare,
  Share2,
  Shield,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { LogoMark } from '@/shared/ui/logo';
import {
  LANDING_WIDTH,
  LandingBentoSection,
  LandingManifestoSection,
  LandingMarqueeReverse,
  LandingPrinciplesSection,
  LandingRhythmSection,
  LandingRolesSection,
  LandingSpotlightSection,
} from './landing-creative-sections';

const MODULES = [
  { title: 'landing.m1.title', body: 'landing.m1.body', icon: Users },
  { title: 'landing.m2.title', body: 'landing.m2.body', icon: Layers },
  { title: 'landing.m3.title', body: 'landing.m3.body', icon: FileCheck },
  { title: 'landing.m4.title', body: 'landing.m4.body', icon: Inbox },
  { title: 'landing.m5.title', body: 'landing.m5.body', icon: Wallet },
  { title: 'landing.m6.title', body: 'landing.m6.body', icon: Zap },
] as const satisfies ReadonlyArray<{ title: string; body: string; icon: LucideIcon }>;

const WORKFLOW_STEPS = [
  'landing.workflow.step1',
  'landing.workflow.step2',
  'landing.workflow.step3',
  'landing.workflow.step4',
  'landing.workflow.step5',
  'landing.workflow.step6',
] as const;

const MARQUEE = [
  'landing.marquee.1',
  'landing.marquee.2',
  'landing.marquee.3',
  'landing.marquee.4',
  'landing.marquee.5',
  'landing.marquee.6',
] as const;

const STATS = [
  { label: 'landing.stats.1.label', value: 'landing.stats.1.value' },
  { label: 'landing.stats.2.label', value: 'landing.stats.2.value' },
  { label: 'landing.stats.3.label', value: 'landing.stats.3.value' },
  { label: 'landing.stats.4.label', value: 'landing.stats.4.value' },
] as const;

const INTEGRATIONS = [
  'landing.integrations.1',
  'landing.integrations.2',
  'landing.integrations.3',
  'landing.integrations.4',
  'landing.integrations.5',
  'landing.integrations.6',
] as const;

const PORTAL_POINTS = ['landing.portal.b1', 'landing.portal.b2', 'landing.portal.b3'] as const;

const AGENT_POINTS = ['landing.agent.b1', 'landing.agent.b2', 'landing.agent.b3'] as const;

const COMPARE_BEFORE = ['landing.compare.before.1', 'landing.compare.before.2', 'landing.compare.before.3'] as const;
const COMPARE_AFTER = ['landing.compare.after.1', 'landing.compare.after.2', 'landing.compare.after.3'] as const;

const TESTIMONIALS = [
  { quote: 'landing.testimonial.1.quote', role: 'landing.testimonial.1.role' },
  { quote: 'landing.testimonial.2.quote', role: 'landing.testimonial.2.role' },
  { quote: 'landing.testimonial.3.quote', role: 'landing.testimonial.3.role' },
] as const;

const SECURITY = [
  { title: 'landing.security.b1.title', body: 'landing.security.b1.body', icon: Shield },
  { title: 'landing.security.b2.title', body: 'landing.security.b2.body', icon: Lock },
  { title: 'landing.security.b3.title', body: 'landing.security.b3.body', icon: FileCheck },
] as const;

const FAQ = [
  { q: 'landing.faq.1.q', a: 'landing.faq.1.a' },
  { q: 'landing.faq.2.q', a: 'landing.faq.2.a' },
  { q: 'landing.faq.3.q', a: 'landing.faq.3.a' },
  { q: 'landing.faq.4.q', a: 'landing.faq.4.a' },
] as const;

export function LandingHome() {
  return (
    <main id="main">
      <section className={`relative ${LANDING_WIDTH} pb-10 pt-10 sm:pb-14 sm:pt-14 lg:pb-20 lg:pt-20`}>
        <div className="marketing-rise">
          <div className="flex flex-col gap-10 border-b border-border-soft/70 pb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:pb-14">
            <div className="flex min-w-0 flex-1 flex-col gap-6 sm:gap-8">
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                <LogoMark size={36} className="p-1.5" />
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t('landing.brand')}</p>
                  <p className="eyebrow mt-1.5">{t('landing.hero.badge')}</p>
                </div>
              </div>
              <h1 className="display max-w-[22ch] text-balance text-[2.35rem] leading-[1.06] text-foreground sm:max-w-none sm:text-5xl lg:text-[4.25rem] xl:text-[4.75rem]">
                {t('landing.title')}
              </h1>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:max-w-md lg:text-right lg:text-[1.05rem]">
              {t('landing.subtitle')}
            </p>
          </div>

          <ul className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5 lg:mt-12">
            {(['landing.hero.point1', 'landing.hero.point2', 'landing.hero.point3'] as const).map((key) => (
              <li key={key} className="landing-card flex gap-3 p-5 text-sm leading-relaxed text-foreground/90 sm:p-6">
                <Check className="mt-0.5 size-4 shrink-0 text-foreground/70" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>

          <div id="stats" className="mt-8 grid gap-px border border-border-soft/80 bg-border-soft/40 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
            {STATS.map(({ label, value }) => (
              <div key={label} className="landing-stat-card bg-black px-5 py-6 sm:px-6">
                <p className="font-mono text-2xl tracking-tight text-foreground sm:text-3xl">{t(value)}</p>
                <p className="mt-2 text-sm text-muted">{t(label)}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:mt-12">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" className="landing-cta-glow" asChild>
                <Link href="/register">
                  {t('landing.cta.start')}
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">{t('landing.cta.demo')}</Link>
              </Button>
            </div>
            <p className="text-xs text-muted sm:max-w-sm sm:text-right">{t('landing.hero.note')}</p>
          </div>
        </div>
      </section>

      <section className="landing-marquee border-y border-border-soft/60 py-4" aria-label={t('landing.marquee.label')}>
        <div className="landing-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((key, i) => (
            <span key={`${key}-${i}`} className="landing-marquee-item">
              {t(key)}
            </span>
          ))}
        </div>
      </section>

      <LandingManifestoSection />
      <LandingBentoSection />
      <LandingMarqueeReverse />

      <section id="modules" className={`marketing-stage ${LANDING_WIDTH} py-16 sm:py-20 lg:py-28`}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="eyebrow">{t('landing.modules.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl lg:text-[2.6rem]">{t('landing.modules.title')}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted lg:text-right lg:text-base">{t('landing.modules.body')}</p>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ title, body, icon: Icon }, index) => (
            <li key={title} className="landing-card group p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <span className="landing-icon-ring">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-mono text-[11px] tracking-[0.18em] text-muted/80">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-5 text-lg text-foreground">{t(title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(body)}</p>
            </li>
          ))}
        </ul>
      </section>

      <LandingPrinciplesSection />
      <LandingRolesSection />

      <section id="workflow" className="marketing-stage relative border-t border-border-soft/60">
        <div className={`relative ${LANDING_WIDTH} py-16 sm:py-20 lg:py-28`}>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="eyebrow">{t('landing.workflow.eyebrow')}</p>
              <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl lg:text-[2.5rem]">{t('landing.workflow.title')}</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted lg:text-right">{t('landing.workflow.body')}</p>
          </div>
          <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {WORKFLOW_STEPS.map((key, index) => (
              <li key={key} className="landing-workflow-step relative p-4 sm:p-5">
                <span className="font-mono text-[11px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                <p className="mt-3 text-sm font-medium text-foreground">{t(key)}</p>
                {index < WORKFLOW_STEPS.length - 1 ? (
                  <span className="landing-workflow-connector hidden lg:block" aria-hidden />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="integrations" className={`marketing-stage ${LANDING_WIDTH} py-16 sm:py-20 lg:py-24`}>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">{t('landing.integrations.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.integrations.title')}</h2>
            <p className="mt-4 text-muted">{t('landing.integrations.body')}</p>
          </div>
          <div className="landing-card p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-2 text-foreground">
              <Share2 className="size-4" aria-hidden />
              <span className="text-sm font-medium">{t('landing.integrations.gridTitle')}</span>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INTEGRATIONS.map((key) => (
                <li
                  key={key}
                  className="rounded-md border border-border-soft/80 bg-black/60 px-3 py-3 text-center text-xs font-medium uppercase tracking-[0.12em] text-foreground/90"
                >
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="agent" className="marketing-stage border-t border-border-soft/60">
        <div className={`grid gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24 ${LANDING_WIDTH}`}>
          <div className="landing-card relative overflow-hidden p-8 sm:p-10">
            <div className="landing-agent-orbit pointer-events-none absolute -right-8 -top-8 size-40 rounded-full blur-2xl" aria-hidden />
            <Bot className="size-10 text-foreground/90" aria-hidden />
            <p className="eyebrow mt-6">{t('landing.agent.eyebrow')}</p>
            <h2 className="display mt-2 text-2xl text-foreground sm:text-3xl">{t('landing.agent.title')}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{t('landing.agent.body')}</p>
          </div>
          <div>
            <ul className="space-y-4">
              {AGENT_POINTS.map((key) => (
                <li key={key} className="flex gap-3 border-l border-foreground/25 pl-4 text-sm text-foreground/95">
                  {t(key)}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center gap-3 text-xs text-muted">
              <Calendar className="size-4 shrink-0" aria-hidden />
              {t('landing.agent.note')}
            </div>
          </div>
        </div>
      </section>

      <LandingRhythmSection />
      <LandingSpotlightSection />

      <section id="portal" className={`marketing-stage ${LANDING_WIDTH} py-16 sm:py-20 lg:py-28`}>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="eyebrow">{t('landing.portal.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.portal.title')}</h2>
            <p className="mt-4 max-w-xl text-muted">{t('landing.portal.body')}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {(['landing.portal.chip1', 'landing.portal.chip2', 'landing.portal.chip3'] as const).map((key) => (
                <span key={key} className="landing-pill text-[11px]">{t(key)}</span>
              ))}
            </div>
          </div>
          <ul className="landing-card divide-y divide-border-soft/80 overflow-hidden">
            {PORTAL_POINTS.map((key) => (
              <li key={key} className="flex gap-3 px-5 py-4 text-sm text-foreground">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="marketing-stage border-t border-border-soft/60">
        <div className={`${LANDING_WIDTH} py-16 sm:py-20 lg:py-24`}>
          <div className="max-w-2xl">
            <p className="eyebrow">{t('landing.compare.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.compare.title')}</h2>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <div className="landing-card border-dashed p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{t('landing.compare.beforeLabel')}</p>
              <ul className="mt-5 space-y-3 text-sm text-muted">
                {COMPARE_BEFORE.map((key) => (
                  <li key={key} className="flex gap-2">
                    <span className="text-muted/60">×</span>
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="landing-card landing-card-highlight p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground">{t('landing.compare.afterLabel')}</p>
              <ul className="mt-5 space-y-3 text-sm text-foreground/95">
                {COMPARE_AFTER.map((key) => (
                  <li key={key} className="flex gap-2">
                    <Check className="size-4 shrink-0 text-foreground/70" aria-hidden />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={`marketing-stage ${LANDING_WIDTH} py-16 sm:py-20`}>
        <p className="eyebrow text-center">{t('landing.testimonials.eyebrow')}</p>
        <h2 className="display mt-3 text-center text-3xl text-foreground sm:text-4xl">{t('landing.testimonials.title')}</h2>
        <ul className="mt-12 grid gap-4 lg:grid-cols-3">
          {TESTIMONIALS.map(({ quote, role }) => (
            <li key={quote} className="landing-card flex flex-col p-6 sm:p-7">
              <p className="flex-1 text-sm leading-relaxed text-foreground/90">&ldquo;{t(quote)}&rdquo;</p>
              <p className="mt-5 text-xs uppercase tracking-[0.14em] text-muted">{t(role)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="security" className="marketing-stage border-t border-border-soft/60">
        <div className={`${LANDING_WIDTH} py-16 sm:py-20 lg:py-28`}>
          <div className="max-w-2xl">
            <p className="eyebrow">{t('landing.security.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.security.title')}</h2>
            <p className="mt-4 text-muted">{t('landing.security.body')}</p>
          </div>
          <ul className="mt-14 grid gap-4 sm:grid-cols-3">
            {SECURITY.map(({ title, body, icon: Icon }) => (
              <li key={title} className="landing-card p-6">
                <Icon className="size-5 text-foreground/80" aria-hidden />
                <h3 className="mt-4 text-base text-foreground">{t(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(body)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" className={`marketing-stage ${LANDING_WIDTH} py-16 sm:py-20 lg:py-24`}>
        <div className="max-w-2xl">
          <p className="eyebrow">{t('landing.faq.eyebrow')}</p>
          <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.faq.title')}</h2>
        </div>
        <dl className="mt-12 divide-y divide-border-soft/80 border border-border-soft/80">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="landing-faq-item px-5 py-5 sm:px-6 sm:py-6">
              <dt className="text-sm font-medium text-foreground">{t(q)}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted">{t(a)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="marketing-stage border-t border-border-soft/60 pb-8">
        <div className={`${LANDING_WIDTH} py-16 sm:py-24`}>
          <div className="landing-final-panel relative overflow-hidden rounded-2xl border border-border-strong/80 px-6 py-12 sm:px-10 sm:py-14 lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div className="landing-final-glow pointer-events-none absolute inset-0" aria-hidden />
            <div className="relative max-w-xl">
              <h2 className="display text-3xl text-foreground sm:text-4xl">{t('landing.final.title')}</h2>
              <p className="mt-4 text-muted">{t('landing.final.body')}</p>
            </div>
            <div className="relative mt-8 flex flex-wrap gap-3 lg:mt-0">
              <Button variant="primary" size="lg" className="landing-cta-glow" asChild>
                <Link href="/register">{t('landing.cta.start')}</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">{t('landing.cta.signin')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
