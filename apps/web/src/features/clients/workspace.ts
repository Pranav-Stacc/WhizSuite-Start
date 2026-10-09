import type { UserRole } from '@agency-os/contracts';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';

export const CLIENT_WORKSPACE_SECTIONS = ['overview', 'grid', 'calendar', 'messages', 'assets', 'invoices', 'integrations'] as const;
export type ClientSection = (typeof CLIENT_WORKSPACE_SECTIONS)[number];

const LEADERSHIP_SECTIONS: ReadonlySet<ClientSection> = new Set(['invoices']);

export function clientSectionsFor(role: UserRole): ClientSection[] {
  const leadership = ROLES_LEADERSHIP.includes(role);
  return CLIENT_WORKSPACE_SECTIONS.filter((section) => leadership || !LEADERSHIP_SECTIONS.has(section));
}

export function clientSectionHref(clientId: string, section: ClientSection): string {
  return section === 'overview' ? `/clients/${clientId}` : `/clients/${clientId}/${section}`;
}

/** 1-based position used for the editorial "( 02 ) GRID" section numbering. */
export function clientSectionNumber(section: ClientSection): number {
  return CLIENT_WORKSPACE_SECTIONS.indexOf(section) + 1;
}
