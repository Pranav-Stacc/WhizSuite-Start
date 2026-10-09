import { UserRoles, type ContentStatus, type UserRole } from '@agency-os/contracts';

/** Allowed status moves. Anything not listed here is rejected by the server and the board. */
export const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'CHANGES_REQUESTED', 'DRAFT'],
  CHANGES_REQUESTED: ['IN_REVIEW', 'DRAFT'],
  APPROVED: ['SCHEDULED', 'DRAFT'],
  SCHEDULED: ['PUBLISHED', 'APPROVED', 'DRAFT'],
  PUBLISHED: [],
};

/** Moves only an owner/manager (the approver) may perform. */
const APPROVER_ONLY_TARGETS: ContentStatus[] = ['APPROVED', 'CHANGES_REQUESTED', 'PUBLISHED'];
const APPROVER_ROLES: UserRole[] = [UserRoles.OWNER, UserRoles.MANAGER];

export type TransitionCheck = 'ok' | 'invalid' | 'forbidden' | 'needsSchedule';

export function checkTransition(role: UserRole, post: { status: ContentStatus; scheduledAt?: string }, target: ContentStatus): TransitionCheck {
  if (!TRANSITIONS[post.status].includes(target)) return 'invalid';
  if (APPROVER_ONLY_TARGETS.includes(target) && !APPROVER_ROLES.includes(role)) return 'forbidden';
  if (target === 'SCHEDULED' && !post.scheduledAt) return 'needsSchedule';
  return 'ok';
}

export function canApprove(role: UserRole): boolean {
  return APPROVER_ROLES.includes(role);
}

/** Published content is immutable; everything else may still be edited (which re-opens review). */
export function isEditable(status: ContentStatus): boolean {
  return status !== 'PUBLISHED';
}

/** Approvers may delete any post; authors only their own posts that have not gone live. */
export function canDeleteContent(viewer: { role: UserRole; userId: string }, post: { authorId: string; status: ContentStatus }): boolean {
  if (APPROVER_ROLES.includes(viewer.role)) return true;
  return post.authorId === viewer.userId && isEditable(post.status);
}

/** Statuses whose approval is voided when the content is edited. */
export function resetsApprovalOnEdit(status: ContentStatus): boolean {
  return status === 'APPROVED' || status === 'SCHEDULED' || status === 'IN_REVIEW';
}
