import { Clock } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Avatar } from '@/shared/ui/avatar';
import { DueBadge } from '@/shared/ui/due-badge';
import { StatusBadge } from '@/shared/ui/status';
import type { Task } from '../data/tasks.repository';

interface TaskCardContentProps {
  task: Task;
  clientName?: string;
  clientColor?: string;
  assigneeNames: string[];
}

/** Card body shown in the board; the surrounding Kanban card supplies drag, link and move menu. */
export function TaskCardContent({ task, clientName, clientColor, assigneeNames }: TaskCardContentProps) {
  return (
    <div className="space-y-2.5 pr-5">
      <p className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="size-2 shrink-0 rounded-full" style={{ background: clientColor ?? 'var(--border)' }} />
        <span className="truncate">{clientName ?? t('common.none')}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge kind="priority" value={task.priority} dot={false} />
        <DueBadge date={task.dueDate} done={task.status === 'DONE'} />
        {task.estimateHours !== undefined ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs tabular-nums text-muted">
            <Clock className="size-3" />
            {t('common.hours', { hours: task.estimateHours })}
          </span>
        ) : null}
        {assigneeNames.length > 0 ? (
          <span className="inline-flex -space-x-1.5">
            {assigneeNames.slice(0, 3).map((name) => (
              <Avatar key={name} name={name} size="xs" />
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
