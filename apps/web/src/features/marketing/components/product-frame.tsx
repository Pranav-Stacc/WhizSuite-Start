import { t } from '@/shared/i18n/t';

const METRICS = [
  { label: 'landing.frame.metric.1.label', value: 'landing.frame.metric.1.value' },
  { label: 'landing.frame.metric.2.label', value: 'landing.frame.metric.2.value' },
  { label: 'landing.frame.metric.3.label', value: 'landing.frame.metric.3.value' },
] as const;

const NAV = [
  'landing.frame.item.dashboard',
  'landing.frame.item.clients',
  'landing.frame.item.content',
  'landing.frame.item.approvals',
  'landing.frame.item.invoices',
] as const;

/** Stylized Agency OS cockpit — the landing visual anchor (matches in-app chrome). */
export function ProductFrame() {
  return (
    <div className="marketing-frame relative overflow-hidden border border-border-strong bg-surface" aria-hidden>
      <div className="flex items-center justify-between border-b border-border-soft px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="wordmark truncate text-[10px] tracking-[0.28em]">{t('app.name')}</span>
          <span className="hidden h-3 w-px bg-border-strong sm:block" />
          <span className="eyebrow hidden sm:inline">{t('landing.frame.workspace')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 bg-foreground/40" />
          <span className="size-2 bg-foreground/25" />
          <span className="size-2 bg-foreground/15" />
        </div>
      </div>

      {/* Mobile / tablet: horizontal sidebar strip */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border-soft px-2 py-2 lg:hidden">
        {NAV.map((key, i) => (
          <span
            key={key}
            className={
              i === 0
                ? 'shrink-0 border border-foreground/35 bg-foreground/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-foreground'
                : 'shrink-0 border border-transparent px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted'
            }
          >
            {t(key)}
          </span>
        ))}
      </div>

      <div className="grid min-h-[260px] sm:min-h-[340px] lg:min-h-[420px] lg:grid-cols-[148px_1fr]">
        <aside className="hidden border-r border-border-soft p-4 lg:block">
          <p className="eyebrow mb-4">{t('landing.frame.nav')}</p>
          <ul className="space-y-2">
            {NAV.map((key, i) => (
              <li
                key={key}
                className={
                  i === 0
                    ? 'border-l-2 border-foreground pl-2 text-[11px] uppercase tracking-[0.14em] text-foreground'
                    : 'border-l-2 border-transparent pl-2 text-[11px] uppercase tracking-[0.14em] text-muted'
                }
              >
                {t(key)}
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div className="grid gap-px border-b border-border-soft bg-border-soft sm:grid-cols-3">
            {METRICS.map((metric) => (
              <div key={metric.label} className="bg-surface p-3 sm:p-4">
                <p className="eyebrow">{t(metric.label)}</p>
                <p className="mt-2 font-mono text-xl tracking-tight text-foreground sm:text-2xl">{t(metric.value)}</p>
              </div>
            ))}
          </div>

          <div className="grid flex-1 gap-px bg-border-soft sm:grid-cols-2">
            <div className="bg-surface p-3 sm:p-4">
              <p className="eyebrow mb-3">{t('landing.frame.pipeline')}</p>
              <ul className="space-y-2">
                {[0.92, 0.68, 0.44, 0.28].map((w, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="size-1.5 shrink-0 bg-foreground/50" />
                    <span className="h-px bg-foreground/25" style={{ width: `${Math.round(w * 100)}%` }} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface p-3 sm:p-4">
              <p className="eyebrow mb-3">{t('landing.frame.calendar')}</p>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 21 }, (_, i) => (
                  <span
                    key={i}
                    className={
                      i % 5 === 0
                        ? 'aspect-square border border-foreground/35 bg-foreground/10'
                        : 'aspect-square border border-border-soft bg-background/40'
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
