import 'server-only';
import {
  DEFAULT_MEMBERSHIP_ROLES,
  RoleKinds,
  ScopeTypes,
  type MembershipType,
  type RoleKind,
  type ScopeType,
} from '@agency-os/contracts';
import { rolesLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { DEMO_SYSTEM_ROLE_IDS } from '../config';

export interface AgencyRole extends Entity {
  name: string;
  description: string;
  isSystem: boolean;
  kind: RoleKind;
  defaultScopeTypes: ScopeType[];
  permissionKeys: string[];
  memberCount: number;
}

const DEMO_SYSTEM_TYPES: MembershipType[] = ['OWNER', 'ADMIN', 'MEMBER', 'CLIENT'];

export const rolesRepository = createRepository<AgencyRole>(
  'roles',
  () =>
    DEMO_SYSTEM_TYPES.map((type) => {
      const template = DEFAULT_MEMBERSHIP_ROLES[type];
      return {
        id: DEMO_SYSTEM_ROLE_IDS[type],
        name: template.name,
        description: '',
        isSystem: true,
        kind: template.kind ?? RoleKinds.ACCESS,
        defaultScopeTypes: [...(template.defaultScopeTypes ?? [ScopeTypes.ORGANIZATION])],
        permissionKeys: [...template.permissions],
        memberCount: 0,
      };
    }),
  rolesLive,
);
