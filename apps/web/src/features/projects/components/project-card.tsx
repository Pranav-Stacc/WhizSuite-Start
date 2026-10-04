import Link from 'next/link';
import { CalendarDays, Wallet } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { dueInfo, formatMoney } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/feedback';
import { StatusBadge } from '@/shared/ui/status';
import type { ProjectWithProgress } from '../services/projects.service';

interface ProjectCardProps {
  project: ProjectWithProgress;
  clientName?: string;
  clientColor?: string;
  ownerName?: string;
}

export function ProjectCard({ project, clientName, clientColor, ownerName }: ProjectCardProps) {
  const due = dueInfo(project.endDate, project.status === 'COMPLETED');
  return (
    <Card hover className="relative flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className="size-2 shrink-0 rounded-full" style={{ background: clientColor }} />
            <span className="truncate">{clientName}</span>
          </p>
          <h2 className="mt-1 truncate text-base font-semibold">
            <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary">
              {project.name}
            </Link>
          </h2>
        </div>
        <StatusBadge kind="project" value={project.status} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span>{t('projects.progress', { done: project.doneCount, total: project.taskCount })}</span>
          <span className="tabular-nums text-foreground">{project.progress}%</span>
        </div>
        <Progress value={project.progress} tone={project.progress === 100 ? 'primary' : 'info'} />
      </div>

      <div className="mt-auto flex items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="size-3.5" />
          {formatMoney(project.budgetMinor, undefined, true)}
        </span>
        {project.endDate ? (
          <Badge tone={due.tone === 'danger' ? 'danger' : due.tone === 'warning' ? 'warning' : 'neutral'}>
            <CalendarDays className="size-3" />
            {due.label}
          </Badge>
        ) : null}
        {ownerName ? (
          <span className="ml-auto">
            <Avatar name={ownerName} size="xs" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
