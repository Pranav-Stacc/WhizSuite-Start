import { Clock } from 'lucide-react';
import { Avatar } from '@/shared/ui/avatar';
import { DueBadge } from '@/shared/ui/due-badge';
import { StatusBadge } from '@/shared/ui/status';
import type { Task } from '../data/tasks.repository';

interface TaskCardContentProps {
  task: Task;
  clientName?: string;
  clientColor?: string;
  assigneeName?: string;
}

/** Card body shown in the board; the surrounding Kanban card supplies drag, link and move menu. */
export function TaskCardContent({ task, clientName, clientColor, assigneeName }: TaskCardContentProps) {
  return (
    <div className="space-y-2.5 pr-5">
      <p className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="size-2 shrink-0 rounded-full" style={{ background: clientColor }} />
        <span className="truncate">{clientName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge kind="priority" value={task.priority} dot={false} />
        <DueBadge date={task.dueDate} done={task.status === 'DONE'} />
        {task.estimateHours !== undefined ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs tabular-nums text-muted">
            <Clock className="size-3" />
            {task.estimateHours}h
          </span>
        ) : null}
        {assigneeName ? <Avatar name={assigneeName} size="xs" /> : null}
      </div>
    </div>
  );
}
