import { Injectable } from '@nestjs/common';
import { AccessRepository } from '../../infrastructure/repositories/access.repository';
import {
  DEFAULT_MEMBERSHIP_ROLES,
  type InvitableMembershipType,
} from '../../config/default-roles';

@Injectable()
export class DefaultRolesService {
  constructor(private readonly repository: AccessRepository) {}

  /** Resolves the organisation's system role for a membership type, provisioning it on first use. */
  async roleIdFor(
    organizationId: string,
    membershipType: InvitableMembershipType,
  ): Promise<string> {
    const template = DEFAULT_MEMBERSHIP_ROLES[membershipType];
    const role = await this.repository.findOrCreateSystemRole(
      organizationId,
      template.name,
      template.permissions,
    );
    return role.id;
  }
}
