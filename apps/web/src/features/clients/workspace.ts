import { Permissions, type Permission } from '@agency-os/contracts';

export const CLIENT_WORKSPACE_SECTIONS = ['overview', 'grid', 'calendar', 'messages', 'assets', 'invoices', 'integrations'] as const;
export type ClientSection = (typeof CLIENT_WORKSPACE_SECTIONS)[number];

/** Permission the API requires for the data each workspace section shows. */
const SECTION_PERMISSION: Record<ClientSection, Permission> = {
  overview: Permissions.CLIENTS_VIEW,
  grid: Permissions.CONTENT_VIEW,
  calendar: Permissions.CONTENT_VIEW,
  messages: Permissions.INBOX_VIEW,
  assets: Permissions.FILES_VIEW,
  invoices: Permissions.INVOICES_VIEW,
  integrations: Permissions.INTEGRATIONS_MANAGE,
};

export function clientSectionsFor(granted: ReadonlySet<Permission>): ClientSection[] {
  return CLIENT_WORKSPACE_SECTIONS.filter((section) => granted.has(SECTION_PERMISSION[section]));
}

export function clientSectionHref(clientId: string, section: ClientSection): string {
  return section === 'overview' ? `/clients/${clientId}` : `/clients/${clientId}/${section}`;
}

/** 1-based position used for the editorial "( 02 ) GRID" section numbering. */
export function clientSectionNumber(section: ClientSection): number {
  return CLIENT_WORKSPACE_SECTIONS.indexOf(section) + 1;
}
