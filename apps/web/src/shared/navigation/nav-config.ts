import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
  CreditCard,
  FolderKanban,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Plug,
  Receipt,
  Building2,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  SquarePen,
  Target,
  Timer,
  Users,
  UsersRound,
  Workflow,
  Zap,
} from 'lucide-react';
import { UserRoles, type UserRole } from '@agency-os/contracts';
import type { MessageKey } from '@/shared/i18n/t';

export const ROLES_STAFF: UserRole[] = [UserRoles.OWNER, UserRoles.MANAGER, UserRoles.CREATOR];
export const ROLES_LEADERSHIP: UserRole[] = [UserRoles.OWNER, UserRoles.MANAGER];
export const ROLES_OWNER: UserRole[] = [UserRoles.OWNER];

export interface NavItem {
  href: string;
  label: MessageKey;
  desc: MessageKey;
  icon: LucideIcon;
  roles: UserRole[];
}

export interface NavGroup {
  id: string;
  label: MessageKey;
  desc: MessageKey;
  icon: LucideIcon;
  items: NavItem[];
}

export const HOME_ITEM: NavItem = {
  href: '/dashboard',
  label: 'nav.home',
  desc: 'nav.home',
  icon: LayoutDashboard,
  roles: ROLES_STAFF,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'work',
    label: 'nav.group.work',
    desc: 'nav.group.work.desc',
    icon: FolderKanban,
    items: [
      { href: '/tasks', label: 'nav.tasks', desc: 'nav.tasks.desc', icon: CheckSquare, roles: ROLES_STAFF },
      { href: '/projects', label: 'nav.projects', desc: 'nav.projects.desc', icon: Briefcase, roles: ROLES_STAFF },
      { href: '/calendar', label: 'nav.calendar', desc: 'nav.calendar.desc', icon: CalendarDays, roles: ROLES_STAFF },
      { href: '/time', label: 'nav.time', desc: 'nav.time.desc', icon: Timer, roles: ROLES_STAFF },
    ],
  },
  {
    id: 'content',
    label: 'nav.group.content',
    desc: 'nav.group.content.desc',
    icon: SquarePen,
    items: [
      { href: '/content', label: 'nav.content', desc: 'nav.content.desc', icon: SquarePen, roles: ROLES_STAFF },
      { href: '/approvals', label: 'nav.approvals', desc: 'nav.approvals.desc', icon: ShieldCheck, roles: ROLES_STAFF },
      { href: '/media', label: 'nav.media', desc: 'nav.media.desc', icon: ImageIcon, roles: ROLES_STAFF },
    ],
  },
  {
    id: 'clients',
    label: 'nav.group.clients',
    desc: 'nav.group.clients.desc',
    icon: Users,
    items: [
      { href: '/clients', label: 'nav.clients', desc: 'nav.clients.desc', icon: Users, roles: ROLES_LEADERSHIP },
      { href: '/leads', label: 'nav.leads', desc: 'nav.leads.desc', icon: Target, roles: ROLES_LEADERSHIP },
      { href: '/inbox', label: 'nav.inbox', desc: 'nav.inbox.desc', icon: Inbox, roles: ROLES_STAFF },
    ],
  },
  {
    id: 'automate',
    label: 'nav.group.automate',
    desc: 'nav.group.automate.desc',
    icon: Zap,
    items: [
      { href: '/automations', label: 'nav.automations', desc: 'nav.automations.desc', icon: Zap, roles: ROLES_LEADERSHIP },
      { href: '/workflows', label: 'nav.workflows', desc: 'nav.workflows.desc', icon: Workflow, roles: ROLES_LEADERSHIP },
      { href: '/integrations', label: 'nav.integrations', desc: 'nav.integrations.desc', icon: Plug, roles: ROLES_LEADERSHIP },
    ],
  },
  {
    id: 'money',
    label: 'nav.group.money',
    desc: 'nav.group.money.desc',
    icon: Receipt,
    items: [
      { href: '/invoices', label: 'nav.invoices', desc: 'nav.invoices.desc', icon: Receipt, roles: ROLES_LEADERSHIP },
      { href: '/reports', label: 'nav.reports', desc: 'nav.reports.desc', icon: BarChart3, roles: ROLES_LEADERSHIP },
    ],
  },
  {
    id: 'agency',
    label: 'nav.group.agency',
    desc: 'nav.group.agency.desc',
    icon: UsersRound,
    items: [
      { href: '/team', label: 'nav.team', desc: 'nav.team.desc', icon: UsersRound, roles: ROLES_LEADERSHIP },
      { href: '/departments', label: 'nav.departments', desc: 'nav.departments.desc', icon: Building2, roles: ROLES_OWNER },
      { href: '/roles', label: 'nav.roles', desc: 'nav.roles.desc', icon: Shield, roles: ROLES_OWNER },
      { href: '/knowledge', label: 'nav.knowledge', desc: 'nav.knowledge.desc', icon: BookOpen, roles: ROLES_STAFF },
      { href: '/billing', label: 'nav.billing', desc: 'nav.billing.desc', icon: CreditCard, roles: ROLES_OWNER },
      { href: '/audit', label: 'nav.audit', desc: 'nav.audit.desc', icon: ScrollText, roles: ROLES_OWNER },
      { href: '/settings', label: 'nav.settings', desc: 'nav.settings.desc', icon: Settings, roles: ROLES_STAFF },
    ],
  },
];

export function groupsForRole(role: UserRole): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) })).filter((group) => group.items.length > 0);
}

export function activeGroupId(pathname: string): string | undefined {
  return NAV_GROUPS.find((group) => group.items.some((item) => isActivePath(pathname, item.href)))?.id;
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
