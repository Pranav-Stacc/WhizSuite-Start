'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { t } from '@/shared/i18n/t';
import type { Task } from '@/features/tasks/data/tasks.repository';

type Tab = 'overview' | 'work' | 'content' | 'pay' | 'documents';

export function MemberProfileTabs({
  memberId,
  memberName,
  tasks,
  children,
}: {
  memberId: string;
  memberName: string;
  tasks: Task[];
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const assigned = useMemo(
    () => tasks.filter((task) => task.assigneeIds?.includes(memberId)),
    [memberId, tasks],
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'work', label: 'Work' },
    { id: 'content', label: 'Content' },
    { id: 'pay', label: 'Pay' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === item.id ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? children : null}

      {tab === 'work' ? (
        <section className="card-surface space-y-3 p-5">
          <h2 className="text-sm font-semibold">{t('team.detail.workload')}</h2>
          {assigned.length === 0 ? (
            <p className="text-sm text-muted">No tasks assigned to {memberName} yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {assigned.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{task.title}</p>
                    <p className="text-xs text-muted">{task.status}</p>
                  </div>
                  <Link href={`/tasks/${task.id}`} className="text-sm text-primary hover:underline">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'content' ? (
        <section className="card-surface p-5 text-sm text-muted">
          Content by this member is available from the Content workspace. Member-scoped content views are coming next.
        </section>
      ) : null}

      {tab === 'pay' ? (
        <section className="card-surface space-y-3 p-5">
          <h2 className="text-sm font-semibold">Employment & pay</h2>
          <p className="text-sm text-muted">
            Set employment type (employee, freelance, contractor) and review logged hours from the mobile app or Time
            screen.
          </p>
          <Link href="/time" className="inline-flex text-sm text-primary hover:underline">Open time tracking</Link>
        </section>
      ) : null}

      {tab === 'documents' ? (
        <section className="card-surface space-y-3 p-5">
          <h2 className="text-sm font-semibold">HR documents</h2>
          <p className="text-sm text-muted">
            Create offer letters, salary slips, NDAs and agreements from Agency → HR docs, then send them from a member
            profile.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Offer letter</Badge>
            <Badge tone="info">Salary slip</Badge>
            <Badge tone="info">NDA</Badge>
            <Badge tone="info">Employment agreement</Badge>
          </div>
        </section>
      ) : null}
    </div>
  );
}
