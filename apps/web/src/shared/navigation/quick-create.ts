import { CheckSquare, Briefcase, Receipt, SquarePen, Target, Users, type LucideIcon } from 'lucide-react';
import { Permissions, type Permission } from '@agency-os/contracts';
import type { MessageKey } from '@/shared/i18n/t';

export interface QuickCreateAction {
  /** Deep link; the destination page opens its create dialog because of `?new=1`. */
  href: string;
  label: MessageKey;
  icon: LucideIcon;
  permission: Permission;
}

export const QUICK_CREATE: QuickCreateAction[] = [
  { href: '/tasks?new=1', label: 'shell.quickCreate.task', icon: CheckSquare, permission: Permissions.TASKS_CREATE },
  { href: '/content?new=1', label: 'shell.quickCreate.content', icon: SquarePen, permission: Permissions.CONTENT_CREATE },
  { href: '/projects?new=1', label: 'shell.quickCreate.project', icon: Briefcase, permission: Permissions.PROJECTS_CREATE },
  { href: '/clients?new=1', label: 'shell.quickCreate.client', icon: Users, permission: Permissions.CLIENTS_CREATE },
  { href: '/leads?new=1', label: 'shell.quickCreate.lead', icon: Target, permission: Permissions.LEADS_CREATE },
  { href: '/invoices?new=1', label: 'shell.quickCreate.invoice', icon: Receipt, permission: Permissions.INVOICES_CREATE },
];
