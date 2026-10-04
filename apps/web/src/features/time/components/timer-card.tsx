'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, Play, Square, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Card, CardBody } from '@/shared/ui/card';
import { Select } from '@/shared/ui/field';
import { startTimerAction, stopTimerAction } from '../actions/time.actions';

interface TimerCardProps {
  running?: { taskTitle: string; startedAt: string };
  tasks: Array<{ id: string; title: string }>;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export function TimerCard({ running, tasks }: TimerCardProps) {
  const [taskId, setTaskId] = useState('');
  const [now, setNow] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? t('toast.failed'));
    });

  const elapsed = running && now ? now - new Date(running.startedAt).getTime() : 0;

  return (
    <Card className="relative overflow-hidden">
      {running ? <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_60%)]" /> : null}
      <CardBody className="relative">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
            <Timer className="size-4" />
          </span>
          {t('dashboard.timer.title')}
          {running ? <span className="ml-auto size-2 animate-pulse-ring rounded-full bg-primary" aria-hidden /> : null}
        </div>
        <p className="font-mono text-4xl font-semibold tracking-tight tabular-nums" aria-live="off">
          {format(elapsed)}
        </p>
        {running ? (
          <>
            <p className="mt-1 truncate text-sm text-muted">{t('dashboard.timer.running', { task: running.taskTitle })}</p>
            <Button variant="danger" className="mt-4 w-full" disabled={pending} onClick={() => run(stopTimerAction)}>
              {pending ? <Loader2 className="animate-spin" /> : <Square />}
              {t('dashboard.timer.stop')}
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">{t('dashboard.timer.idle')}</p>
            <div className="mt-4 flex gap-2">
              <Select value={taskId} onChange={(e) => setTaskId(e.target.value)} aria-label={t('dashboard.timer.select')}>
                <option value="">{t('dashboard.timer.select')}</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </Select>
              <Button variant="primary" disabled={!taskId || pending} onClick={() => run(() => startTimerAction(taskId))}>
                {pending ? <Loader2 className="animate-spin" /> : <Play />}
                {t('dashboard.timer.start')}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
