import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { Avatar } from '@/shared/ui/avatar';
import { DueBadge } from '@/shared/ui/due-badge';
import { StatusBadge } from '@/shared/ui/status';
import type { Task } from '../data/tasks.repository';

interface TaskListProps {
  tasks: Task[];
  clientName: (clientId: string) => string | undefined;
  clientColor: (clientId: string) => string | undefined;
  assigneeName: (memberId: string | undefined) => string | undefined;
  editHref: (taskId: string) => string;
}

export function TaskList({ tasks, clientName, clientColor, assigneeName, editHref }: TaskListProps) {
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">{t('tasks.list.task')}</th>
            <th className="px-4 py-3 font-medium">{t('tasks.list.client')}</th>
            <th className="px-4 py-3 font-medium">{t('tasks.field.status')}</th>
            <th className="px-4 py-3 font-medium">{t('tasks.field.priority')}</th>
            <th className="px-4 py-3 font-medium">{t('tasks.list.assignee')}</th>
            <th className="px-4 py-3 font-medium">{t('tasks.list.due')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('tasks.list.estimate')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {tasks.map((task) => {
            const assignee = assigneeName(task.assigneeId);
            return (
              <tr key={task.id} className="transition-colors hover:bg-surface-2">
                <td className="max-w-[320px] px-4 py-3">
                  <Link href={editHref(task.id)} className="block truncate font-medium hover:text-primary">
                    {task.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <span className="size-2 rounded-full" style={{ background: clientColor(task.clientId) }} />
                    {clientName(task.clientId)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge kind="task" value={task.status} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge kind="priority" value={task.priority} dot={false} />
                </td>
                <td className="px-4 py-3">
                  {assignee ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={assignee} size="xs" />
                      {assignee}
                    </span>
                  ) : (
                    <span className="text-muted">{t('common.unassigned')}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {task.dueDate ? <DueBadge date={task.dueDate} done={task.status === 'DONE'} /> : <span className="text-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">{task.estimateHours !== undefined ? t('common.hours', { hours: task.estimateHours }) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
