import { dueInfo } from '@/shared/lib/format';
import { Badge, type BadgeTone } from './badge';

const TONE_BY_DUE: Record<ReturnType<typeof dueInfo>['tone'], BadgeTone> = {
  danger: 'danger',
  warning: 'warning',
  neutral: 'neutral',
  success: 'neutral',
};

/** Relative due-date pill ("Today", "3d overdue") coloured by urgency. */
export function DueBadge({ date, done = false }: { date: string | undefined; done?: boolean }) {
  if (!date) return null;
  const due = dueInfo(date, done);
  return <Badge tone={TONE_BY_DUE[due.tone]}>{due.label}</Badge>;
}
