import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { can } from '@/shared/auth/permissions';
import { getSession } from '@/shared/auth/session';

export interface ContentApprovalStepSummary {
  order: number;
  name: string;
  status: string;
  rule: string;
  approverUserIds: string[];
  quorumCount?: number;
}

export interface ContentApprovalSummary {
  requestId: string;
  status: string;
  dueAt: string | null;
  currentStep: ContentApprovalStepSummary;
  totalSteps: number;
  steps: ContentApprovalStepSummary[];
}

type Raw = Record<string, unknown>;

export async function getContentApprovalSummary(
  contentId: string,
): Promise<ContentApprovalSummary | null> {
  if (!(await can(Permissions.APPROVALS_VIEW))) return null;
  const session = await getSession();
  if (!session?.orgId) return null;
  try {
    const raw = await apiFetch<Raw | null>(
      `v1/organizations/${session.orgId}/content/${contentId}/approval-summary`,
    );
    if (!raw || typeof raw !== 'object') return null;
    const step = raw.currentStep as Raw | undefined;
    if (!step) return null;
    const rawSteps = Array.isArray(raw.steps) ? (raw.steps as Raw[]) : [];
    const steps: ContentApprovalStepSummary[] = rawSteps.length
      ? rawSteps.map((row) => ({
          order: Number(row.order ?? 1),
          name: String(row.name ?? ''),
          status: String(row.status ?? 'PENDING'),
          rule: String(row.rule ?? 'ANY'),
          approverUserIds: Array.isArray(row.approverUserIds)
            ? (row.approverUserIds as string[])
            : [],
          quorumCount:
            typeof row.quorumCount === 'number' ? row.quorumCount : undefined,
        }))
      : [
          {
            order: Number(step.order ?? 1),
            name: String(step.name ?? ''),
            status: String(step.status ?? 'PENDING'),
            rule: String(step.rule ?? 'ANY'),
            approverUserIds: Array.isArray(step.approverUserIds)
              ? (step.approverUserIds as string[])
              : [],
            quorumCount:
              typeof step.quorumCount === 'number' ? step.quorumCount : undefined,
          },
        ];

    return {
      requestId: String(raw.requestId ?? ''),
      status: String(raw.status ?? 'PENDING'),
      dueAt: raw.dueAt ? String(raw.dueAt) : null,
      currentStep: {
        order: Number(step.order ?? 1),
        name: String(step.name ?? ''),
        status: String(step.status ?? 'PENDING'),
        rule: String(step.rule ?? 'ANY'),
        approverUserIds: Array.isArray(step.approverUserIds)
          ? (step.approverUserIds as string[])
          : [],
        quorumCount:
          typeof step.quorumCount === 'number' ? step.quorumCount : undefined,
      },
      totalSteps: Number(raw.totalSteps ?? 1),
      steps,
    };
  } catch {
    return null;
  }
}

export async function sendApprovalReminder(requestId: string): Promise<void> {
  const session = await getSession();
  if (!session?.orgId) throw new Error('No session');
  await apiFetch<void>(
    `v1/organizations/${session.orgId}/approvals/${requestId}/remind`,
    { method: 'POST' },
  );
}

export async function canApproveContentStep(
  contentId: string,
  userId: string,
): Promise<boolean> {
  const summary = await getContentApprovalSummary(contentId);
  if (!summary) return true;
  const pool = summary.currentStep.approverUserIds;
  return pool.length === 0 || pool.includes(userId);
}
