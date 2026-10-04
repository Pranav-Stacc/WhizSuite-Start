import { UserRoles, type UserRole } from '@agency-os/contracts';
import type { MessageKey } from '@/shared/i18n/t';

export interface Persona {
  role: UserRole;
  userId: string;
  name: string;
  email: string;
  titleKey: MessageKey;
  blurbKey: MessageKey;
  clientId?: string;
}

export const DEMO_PASSWORD = 'Demo#Pass1234';
export const DEMO_ORG_ID = 'org-pixelforge';
export const DEMO_ORG_NAME = 'PixelForge Studio';

export const PERSONAS: Persona[] = [
  {
    role: UserRoles.OWNER,
    userId: 'm-aarav',
    name: 'Aarav Mehta',
    email: 'owner@pixelforge.agency',
    titleKey: 'auth.persona.owner.title',
    blurbKey: 'auth.persona.owner.blurb',
  },
  {
    role: UserRoles.MANAGER,
    userId: 'm-priya',
    name: 'Priya Nair',
    email: 'manager@pixelforge.agency',
    titleKey: 'auth.persona.manager.title',
    blurbKey: 'auth.persona.manager.blurb',
  },
  {
    role: UserRoles.CREATOR,
    userId: 'm-rohan',
    name: 'Rohan Das',
    email: 'creator@pixelforge.agency',
    titleKey: 'auth.persona.creator.title',
    blurbKey: 'auth.persona.creator.blurb',
  },
  {
    role: UserRoles.CLIENT,
    userId: 'c-neha',
    name: 'Neha Kapoor',
    email: 'neha@lumencoffee.com',
    titleKey: 'auth.persona.client.title',
    blurbKey: 'auth.persona.client.blurb',
    clientId: 'cl-lumen',
  },
];

export function homeFor(role: UserRole): string {
  return role === UserRoles.CLIENT ? '/portal' : '/dashboard';
}

export function isStaff(role: UserRole): boolean {
  return role !== UserRoles.CLIENT;
}

/** Roles that may manage money, people and automation. */
export function isLeadership(role: UserRole): boolean {
  return role === UserRoles.OWNER || role === UserRoles.MANAGER;
}

export function personaByEmail(email: string): Persona | undefined {
  return PERSONAS.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
}

export function personaByRole(role: UserRole): Persona {
  return PERSONAS.find((p) => p.role === role) ?? PERSONAS[0]!;
}
