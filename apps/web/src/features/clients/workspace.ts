export const CLIENT_WORKSPACE_SECTIONS = ['overview', 'grid', 'calendar', 'assets', 'invoices', 'integrations'] as const;
export type ClientSection = (typeof CLIENT_WORKSPACE_SECTIONS)[number];

export function clientSectionHref(clientId: string, section: ClientSection): string {
  return section === 'overview' ? `/clients/${clientId}` : `/clients/${clientId}/${section}`;
}

/** 1-based position used for the editorial "( 02 ) GRID" section numbering. */
export function clientSectionNumber(section: ClientSection): number {
  return CLIENT_WORKSPACE_SECTIONS.indexOf(section) + 1;
}
