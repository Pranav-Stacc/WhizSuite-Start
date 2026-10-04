import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { healthBand, type HealthBand } from '../config';

const BAND_STYLE: Record<HealthBand, { dot: string; text: string }> = {
  good: { dot: 'bg-success', text: 'text-success' },
  fair: { dot: 'bg-warning', text: 'text-warning' },
  risk: { dot: 'bg-danger', text: 'text-danger' },
};

export function HealthPill({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const band = healthBand(score);
  const style = BAND_STYLE[band];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', style.text)} title={t(`clients.health.${band}`)}>
      <span className={cn('size-2 rounded-full', style.dot)} aria-hidden />
      <span className="tabular-nums">{score}</span>
      {showLabel ? <span>{t(`clients.health.${band}`)}</span> : <span className="sr-only">{t(`clients.health.${band}`)}</span>}
    </span>
  );
}
