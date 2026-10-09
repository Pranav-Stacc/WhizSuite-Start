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
import { Permissions, type Permission } from '@agency-os/contracts';
import type { MessageKey } from '@/shared/i18n/t';

export interface NavItem {
  href: string;
  label: MessageKey;
  desc: MessageKey;
  icon: LucideIcon;
  /** Permission the API requires to read this page; omitted for pages every staff member has. */
  permission?: Permission;
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
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'work',
    label: 'nav.group.work',
    desc: 'nav.group.work.desc',
    icon: FolderKanban,
    items: [
      { href: '/tasks', label: 'nav.tasks', desc: 'nav.tasks.desc', icon: CheckSquare, permission: Permissions.TASKS_VIEW },
      { href: '/projects', label: 'nav.projects', desc: 'nav.projects.desc', icon: Briefcase, permission: Permissions.PROJECTS_VIEW },
      { href: '/calendar', label: 'nav.calendar', desc: 'nav.calendar.desc', icon: CalendarDays, permission: Permissions.CONTENT_VIEW },
      { href: '/time', label: 'nav.time', desc: 'nav.time.desc', icon: Timer, permission: Permissions.TIME_TRACK },
    ],
  },
  {
    id: 'content',
    label: 'nav.group.content',
    desc: 'nav.group.content.desc',
    icon: SquarePen,
    items: [
      { href: '/content', label: 'nav.content', desc: 'nav.content.desc', icon: SquarePen, permission: Permissions.CONTENT_VIEW },
      { href: '/approvals', label: 'nav.approvals', desc: 'nav.approvals.desc', icon: ShieldCheck, permission: Permissions.APPROVALS_VIEW },
      { href: '/media', label: 'nav.media', desc: 'nav.media.desc', icon: ImageIcon, permission: Permissions.FILES_VIEW },
    ],
  },
  {
    id: 'clients',
    label: 'nav.group.clients',
    desc: 'nav.group.clients.desc',
    icon: Users,
    items: [
      { href: '/clients', label: 'nav.clients', desc: 'nav.clients.desc', icon: Users, permission: Permissions.CLIENTS_VIEW },
      { href: '/leads', label: 'nav.leads', desc: 'nav.leads.desc', icon: Target, permission: Permissions.LEADS_VIEW },
      { href: '/inbox', label: 'nav.inbox', desc: 'nav.inbox.desc', icon: Inbox, permission: Permissions.INBOX_VIEW },
    ],
  },
  {
    id: 'automate',
    label: 'nav.group.automate',
    desc: 'nav.group.automate.desc',
    icon: Zap,
    items: [
      { href: '/automations', label: 'nav.automations', desc: 'nav.automations.desc', icon: Zap, permission: Permissions.AUTOMATIONS_MANAGE },
      { href: '/workflows', label: 'nav.workflows', desc: 'nav.workflows.desc', icon: Workflow, permission: Permissions.WORKFLOWS_MANAGE },
      { href: '/integrations', label: 'nav.integrations', desc: 'nav.integrations.desc', icon: Plug, permission: Permissions.INTEGRATIONS_MANAGE },
    ],
  },
  {
    id: 'money',
    label: 'nav.group.money',
    desc: 'nav.group.money.desc',
    icon: Receipt,
    items: [
      { href: '/invoices', label: 'nav.invoices', desc: 'nav.invoices.desc', icon: Receipt, permission: Permissions.INVOICES_VIEW },
      { href: '/reports', label: 'nav.reports', desc: 'nav.reports.desc', icon: BarChart3, permission: Permissions.REPORTS_VIEW },
    ],
  },
  {
    id: 'agency',
    label: 'nav.group.agency',
    desc: 'nav.group.agency.desc',
    icon: UsersRound,
    items: [
      { href: '/team', label: 'nav.team', desc: 'nav.team.desc', icon: UsersRound, permission: Permissions.MEMBERS_VIEW },
      { href: '/departments', label: 'nav.departments', desc: 'nav.departments.desc', icon: Building2, permission: Permissions.ORG_SETTINGS_MANAGE },
      { href: '/roles', label: 'nav.roles', desc: 'nav.roles.desc', icon: Shield, permission: Permissions.ROLES_MANAGE },
      { href: '/knowledge', label: 'nav.knowledge', desc: 'nav.knowledge.desc', icon: BookOpen, permission: Permissions.ORG_VIEW },
      { href: '/billing', label: 'nav.billing', desc: 'nav.billing.desc', icon: CreditCard, permission: Permissions.ORG_BILLING_MANAGE },
      { href: '/audit', label: 'nav.audit', desc: 'nav.audit.desc', icon: ScrollText, permission: Permissions.AUDIT_VIEW },
      { href: '/settings', label: 'nav.settings', desc: 'nav.settings.desc', icon: Settings },
    ],
  },
];

/** Shown as flat text links in the top bar; every other page lives under "More". */
export const PRIMARY_NAV_HREFS = ['/dashboard', '/clients', '/tasks', '/content', '/calendar', '/media', '/invoices'] as const;

export function isAllowed(item: { permission?: Permission }, granted: ReadonlySet<Permission>): boolean {
  return item.permission === undefined || granted.has(item.permission);
}

export function primaryNav(granted: ReadonlySet<Permission>): NavItem[] {
  const byHref = new Map([HOME_ITEM, ...NAV_GROUPS.flatMap((g) => g.items)].map((item) => [item.href, item]));
  return PRIMARY_NAV_HREFS.flatMap((href) => {
    const item = byHref.get(href);
    return item && isAllowed(item, granted) ? [item] : [];
  });
}

export function secondaryGroups(granted: ReadonlySet<Permission>): NavGroup[] {
  const primary = new Set<string>(PRIMARY_NAV_HREFS);
  return allowedGroups(granted)
    .map((group) => ({ ...group, items: group.items.filter((item) => !primary.has(item.href)) }))
    .filter((group) => group.items.length > 0);
}

export function allowedGroups(granted: ReadonlySet<Permission>): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => isAllowed(item, granted)) })).filter((group) => group.items.length > 0);
}

export function activeGroupId(pathname: string): string | undefined {
  return NAV_GROUPS.find((group) => group.items.some((item) => isActivePath(pathname, item.href)))?.id;
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
