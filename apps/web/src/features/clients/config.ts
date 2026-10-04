/** Health-score thresholds that drive the traffic-light indicator across the client UI. */
export const HEALTH_THRESHOLDS = { good: 80, fair: 60 } as const;

/** Brand colour assigned to a new client until its brand kit is edited. */
export const DEFAULT_CLIENT_COLOR = '#18E889';

/** Starting health for a newly added client (no history to score yet). */
export const INITIAL_HEALTH_SCORE = 80;

export type HealthBand = 'good' | 'fair' | 'risk';

export function healthBand(score: number): HealthBand {
  if (score >= HEALTH_THRESHOLDS.good) return 'good';
  if (score >= HEALTH_THRESHOLDS.fair) return 'fair';
  return 'risk';
}
