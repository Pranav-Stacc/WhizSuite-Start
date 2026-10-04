import { CheckSquare, Briefcase, Receipt, SquarePen, Target, Users, type LucideIcon } from 'lucide-react';
import type { UserRole } from '@agency-os/contracts';
import type { MessageKey } from '@/shared/i18n/t';
import { ROLES_LEADERSHIP, ROLES_STAFF } from './nav-config';

export interface QuickCreateAction {
  /** Deep link; the destination page opens its create dialog because of `?new=1`. */
  href: string;
  label: MessageKey;
  icon: LucideIcon;
  roles: UserRole[];
}

export const QUICK_CREATE: QuickCreateAction[] = [
  { href: '/tasks?new=1', label: 'shell.quickCreate.task', icon: CheckSquare, roles: ROLES_STAFF },
  { href: '/content?new=1', label: 'shell.quickCreate.content', icon: SquarePen, roles: ROLES_STAFF },
  { href: '/projects?new=1', label: 'shell.quickCreate.project', icon: Briefcase, roles: ROLES_LEADERSHIP },
  { href: '/clients?new=1', label: 'shell.quickCreate.client', icon: Users, roles: ROLES_LEADERSHIP },
  { href: '/leads?new=1', label: 'shell.quickCreate.lead', icon: Target, roles: ROLES_LEADERSHIP },
  { href: '/invoices?new=1', label: 'shell.quickCreate.invoice', icon: Receipt, roles: ROLES_LEADERSHIP },
];
