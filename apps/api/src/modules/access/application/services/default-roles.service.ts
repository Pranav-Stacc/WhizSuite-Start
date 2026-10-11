import { Injectable } from '@nestjs/common';
import { AccessRepository } from '../../infrastructure/repositories/access.repository';
import {
  MEMBERSHIP_DEFAULT_ROLE_NAME,
  OWNER_MEMBERSHIP_ROLE,
  type InvitableMembershipType,
} from '../../config/default-roles';

@Injectable()
export class DefaultRolesService {
  constructor(private readonly repository: AccessRepository) {}

  provisionDefaultRoleTemplates(organizationId: string) {
    return this.repository.ensureDefaultRoleTemplates(organizationId);
  }

  /** Resolves the organisation's default custom role for a membership type. */
  async roleIdFor(
    organizationId: string,
    membershipType: InvitableMembershipType,
  ): Promise<string> {
    await this.repository.ensureDefaultRoleTemplates(organizationId);
    const roleName = MEMBERSHIP_DEFAULT_ROLE_NAME[membershipType];
    const role = await this.repository.findRoleByName(organizationId, roleName);
    if (!role) {
      throw new Error(
        `Default role "${roleName}" is missing for organisation ${organizationId}`,
      );
    }
    return role.id;
  }

  /** System owner role — not used for invitations. */
  async ownerRoleId(organizationId: string): Promise<string> {
    const role = await this.repository.findOrCreateSystemRole(
      organizationId,
      OWNER_MEMBERSHIP_ROLE.name,
      OWNER_MEMBERSHIP_ROLE.permissions,
    );
    return role.id;
  }
}
