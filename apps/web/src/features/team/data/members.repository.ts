import 'server-only';
import { UserRoles, type AccessRoleSummary } from '@agency-os/contracts';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';
import { demoSystemRole } from '@/features/roles/config';

export type MemberRole = typeof UserRoles.OWNER | typeof UserRoles.MANAGER | typeof UserRoles.CREATOR;

export interface Member extends Entity {
  name: string;
  email: string;
  role: MemberRole;
  /** Roles whose permissions this member holds; empty for pending invitations. */
  roles: AccessRoleSummary[];
  title: string;
  capacityHours: number;
  skills: string[];
  status: 'ACTIVE' | 'INVITED';
  joinedAt: string;
}

const OWNER_ROLES = [demoSystemRole('OWNER')];
const MANAGER_ROLES = [demoSystemRole('ADMIN')];
const CREATOR_ROLES = [demoSystemRole('MEMBER')];

export const membersRepository = createRepository<Member>('members', () => [
  { id: 'm-aarav', name: 'Aarav Mehta', email: 'owner@pixelforge.agency', role: UserRoles.OWNER, roles: OWNER_ROLES, title: 'Founder & Creative Director', capacityHours: 30, skills: ['Strategy', 'Sales'], status: 'ACTIVE', joinedAt: daysFromNow(-640) },
  { id: 'm-priya', name: 'Priya Nair', email: 'manager@pixelforge.agency', role: UserRoles.MANAGER, roles: MANAGER_ROLES, title: 'Head of Client Success', capacityHours: 40, skills: ['Account management', 'Reporting'], status: 'ACTIVE', joinedAt: daysFromNow(-510) },
  { id: 'm-rohan', name: 'Rohan Das', email: 'creator@pixelforge.agency', role: UserRoles.CREATOR, roles: CREATOR_ROLES, title: 'Senior Designer', capacityHours: 40, skills: ['Design', 'Motion'], status: 'ACTIVE', joinedAt: daysFromNow(-420) },
  { id: 'm-sana', name: 'Sana Iyer', email: 'sana@pixelforge.agency', role: UserRoles.CREATOR, roles: CREATOR_ROLES, title: 'Copywriter', capacityHours: 40, skills: ['Copy', 'SEO'], status: 'ACTIVE', joinedAt: daysFromNow(-300) },
  { id: 'm-kabir', name: 'Kabir Shah', email: 'kabir@pixelforge.agency', role: UserRoles.CREATOR, roles: CREATOR_ROLES, title: 'Video Editor', capacityHours: 40, skills: ['Video', 'Reels'], status: 'ACTIVE', joinedAt: daysFromNow(-210) },
  { id: 'm-meera', name: 'Meera Joshi', email: 'meera@pixelforge.agency', role: UserRoles.CREATOR, roles: CREATOR_ROLES, title: 'Community Manager', capacityHours: 32, skills: ['Community', 'Social listening'], status: 'ACTIVE', joinedAt: daysFromNow(-120) },
  { id: 'm-invite', name: 'dev@freelance.studio', email: 'dev@freelance.studio', role: UserRoles.CREATOR, roles: [], title: 'Freelance motion designer', capacityHours: 20, skills: [], status: 'INVITED', joinedAt: daysFromNow(-2) },
]);
