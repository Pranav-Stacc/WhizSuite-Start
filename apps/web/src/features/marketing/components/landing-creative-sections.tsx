import Link from 'next/link';
import { ArrowRight, Clock, Compass, Palette, PenLine, Sparkles, Target, Users2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';

export const LANDING_WIDTH = 'mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8';

const PRINCIPLES = [
  { n: '01', title: 'landing.principle.1.title', body: 'landing.principle.1.body', icon: Compass },
  { n: '02', title: 'landing.principle.2.title', body: 'landing.principle.2.body', icon: PenLine },
  { n: '03', title: 'landing.principle.3.title', body: 'landing.principle.3.body', icon: Palette },
  { n: '04', title: 'landing.principle.4.title', body: 'landing.principle.4.body', icon: Target },
] as const satisfies ReadonlyArray<{ n: string; title: string; body: string; icon: LucideIcon }>;

const ROLES = [
  { title: 'landing.roles.1.title', body: 'landing.roles.1.body', tag: 'landing.roles.1.tag' },
  { title: 'landing.roles.2.title', body: 'landing.roles.2.body', tag: 'landing.roles.2.tag' },
  { title: 'landing.roles.3.title', body: 'landing.roles.3.body', tag: 'landing.roles.3.tag' },
  { title: 'landing.roles.4.title', body: 'landing.roles.4.body', tag: 'landing.roles.4.tag' },
] as const;

const SPOTLIGHTS = [
  {
    client: 'landing.spotlight.1.client',
    industry: 'landing.spotlight.1.industry',
    headline: 'landing.spotlight.1.headline',
    body: 'landing.spotlight.1.body',
    metric: 'landing.spotlight.1.metric',
    metricLabel: 'landing.spotlight.1.metricLabel',
  },
  {
    client: 'landing.spotlight.2.client',
    industry: 'landing.spotlight.2.industry',
    headline: 'landing.spotlight.2.headline',
    body: 'landing.spotlight.2.body',
    metric: 'landing.spotlight.2.metric',
    metricLabel: 'landing.spotlight.2.metricLabel',
  },
  {
    client: 'landing.spotlight.3.client',
    industry: 'landing.spotlight.3.industry',
    headline: 'landing.spotlight.3.headline',
    body: 'landing.spotlight.3.body',
    metric: 'landing.spotlight.3.metric',
    metricLabel: 'landing.spotlight.3.metricLabel',
  },
] as const;

const RHYTHM = [
  'landing.rhythm.mon',
  'landing.rhythm.tue',
  'landing.rhythm.wed',
  'landing.rhythm.thu',
  'landing.rhythm.fri',
  'landing.rhythm.sat',
  'landing.rhythm.sun',
] as const;

const BENTO = [
  { title: 'landing.bento.1.title', body: 'landing.bento.1.body', span: 'lg:col-span-2 lg:row-span-2' },
  { title: 'landing.bento.2.title', body: 'landing.bento.2.body', span: '' },
  { title: 'landing.bento.3.title', body: 'landing.bento.3.body', span: '' },
  { title: 'landing.bento.4.title', body: 'landing.bento.4.body', span: 'lg:col-span-2' },
  { title: 'landing.bento.5.title', body: 'landing.bento.5.body', span: '' },
] as const;

const STUDIO_TAGS = [
  'landing.studio.tag.1',
  'landing.studio.tag.2',
  'landing.studio.tag.3',
  'landing.studio.tag.4',
  'landing.studio.tag.5',
  'landing.studio.tag.6',
] as const;

export function LandingManifestoSection() {
  return (
    <section id="studio" className="marketing-stage border-t border-border-soft/60">
      <div className={`${LANDING_WIDTH} py-16 sm:py-24 lg:py-32`}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <p className="eyebrow">{t('landing.studio.eyebrow')}</p>
            <h2 className="display mt-4 text-3xl text-foreground sm:text-4xl lg:text-[2.75rem]">{t('landing.studio.title')}</h2>
            <p className="mt-5 text-sm leading-relaxed text-muted sm:text-base">{t('landing.studio.body')}</p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {STUDIO_TAGS.map((key) => (
                <li key={key} className="landing-pill text-[10px]">{t(key)}</li>
              ))}
            </ul>
          </div>
          <blockquote className="landing-manifesto lg:col-span-7 lg:pl-6">
            <p className="text-[1.65rem] font-normal leading-[1.15] tracking-[-0.02em] text-foreground sm:text-3xl lg:text-[2.35rem]">
              {t('landing.studio.quote')}
            </p>
            <footer className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted">
              <Sparkles className="size-3.5" aria-hidden />
              {t('landing.studio.quoteAttribution')}
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}

export function LandingBentoSection() {
  return (
    <section id="craft" className="marketing-stage border-t border-border-soft/60 bg-black">
      <div className={`${LANDING_WIDTH} py-16 sm:py-20 lg:py-28`}>
        <div className="flex flex-col gap-6 border-b border-border-soft/60 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">{t('landing.bento.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl lg:text-[2.6rem]">{t('landing.bento.title')}</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted lg:text-right">{t('landing.bento.intro')}</p>
        </div>
        <ul className="landing-bento mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 lg:gap-4">
          {BENTO.map(({ title, body, span }, index) => (
            <li
              key={title}
              className={`landing-card landing-bento-cell flex flex-col justify-between p-6 sm:p-8 ${span}`}
            >
              <span className="font-mono text-[11px] tracking-[0.2em] text-muted">{String(index + 1).padStart(2, '0')}</span>
              <div className="mt-8">
                <h3 className="text-lg font-medium text-foreground sm:text-xl">{t(title)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t(body)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LandingPrinciplesSection() {
  return (
    <section className="marketing-stage border-t border-border-soft/60">
      <div className={`${LANDING_WIDTH} py-16 sm:py-20 lg:py-28`}>
        <div className="max-w-3xl">
          <p className="eyebrow">{t('landing.principles.eyebrow')}</p>
          <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.principles.title')}</h2>
          <p className="mt-4 text-muted">{t('landing.principles.body')}</p>
        </div>
        <ol className="mt-14 grid gap-4 lg:grid-cols-2 lg:gap-5">
          {PRINCIPLES.map(({ n, title, body, icon: Icon }) => (
            <li key={n} className="landing-card group grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
              <div className="flex flex-col gap-4">
                <span className="font-mono text-4xl font-light tracking-tight text-foreground/25">{n}</span>
                <span className="landing-icon-ring w-fit">
                  <Icon className="size-4" aria-hidden />
                </span>
              </div>
              <div>
                <h3 className="text-lg text-foreground">{t(title)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t(body)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function LandingRolesSection() {
  return (
    <section id="roles" className="marketing-stage border-t border-border-soft/60">
      <div className={`${LANDING_WIDTH} py-16 sm:py-20 lg:py-28`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">{t('landing.roles.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.roles.title')}</h2>
          </div>
          <p className="max-w-lg text-sm text-muted lg:text-right">{t('landing.roles.body')}</p>
        </div>
        <ul className="mt-12 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map(({ title, body, tag }, index) => (
            <li key={title} className="landing-card flex min-h-[220px] flex-col p-6 sm:p-7">
              <div className="flex items-center justify-between gap-2">
                <Users2 className="size-4 text-muted" aria-hidden />
                <span className="font-mono text-[10px] tracking-[0.16em] text-muted">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <span className="landing-pill mt-6 w-fit text-[10px]">{t(tag)}</span>
              <h3 className="mt-4 text-base font-medium text-foreground">{t(title)}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{t(body)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LandingSpotlightSection() {
  return (
    <section id="stories" className="marketing-stage border-t border-border-soft/60">
      <div className={`${LANDING_WIDTH} py-16 sm:py-20 lg:py-28`}>
        <div className="max-w-2xl">
          <p className="eyebrow">{t('landing.spotlight.eyebrow')}</p>
          <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.spotlight.title')}</h2>
          <p className="mt-4 text-muted">{t('landing.spotlight.body')}</p>
        </div>
        <ul className="mt-14 grid gap-4 lg:grid-cols-3">
          {SPOTLIGHTS.map((item) => (
            <li key={item.client} className="landing-card flex flex-col overflow-hidden">
              <div className="border-b border-border-soft/70 px-6 py-5 sm:px-7">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{t(item.industry)}</p>
                <p className="mt-2 text-lg font-medium text-foreground">{t(item.client)}</p>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <h3 className="text-base font-medium leading-snug text-foreground">{t(item.headline)}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{t(item.body)}</p>
                <div className="mt-8 border-t border-border-soft/60 pt-5">
                  <p className="font-mono text-2xl tracking-tight text-foreground">{t(item.metric)}</p>
                  <p className="mt-1 text-xs text-muted">{t(item.metricLabel)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LandingRhythmSection() {
  return (
    <section className="marketing-stage border-t border-border-soft/60">
      <div className={`${LANDING_WIDTH} py-16 sm:py-20`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <p className="eyebrow">{t('landing.rhythm.eyebrow')}</p>
            <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">{t('landing.rhythm.title')}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{t('landing.rhythm.body')}</p>
            <Button variant="outline" size="sm" className="mt-8" asChild>
              <Link href="/register">
                {t('landing.rhythm.cta')}
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {RHYTHM.map((key, index) => (
              <li
                key={key}
                className="landing-rhythm-row flex items-start gap-4 border border-border-soft/70 bg-black px-4 py-4 sm:px-5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-soft font-mono text-[10px] text-muted">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                </span>
                <p className="text-sm leading-relaxed text-foreground/90">{t(key)}</p>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-8 flex items-center gap-2 text-xs text-muted">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          {t('landing.rhythm.note')}
        </p>
      </div>
    </section>
  );
}

export function LandingMarqueeReverse() {
  const items = [...STUDIO_TAGS, ...STUDIO_TAGS];
  return (
    <section className="landing-marquee landing-marquee-reverse border-y border-border-soft/60 py-3" aria-hidden>
      <div className="landing-marquee-track">
        {items.map((key, i) => (
          <span key={`${key}-rev-${i}`} className="landing-marquee-item opacity-70">
            {t(key)}
          </span>
        ))}
      </div>
    </section>
  );
}
