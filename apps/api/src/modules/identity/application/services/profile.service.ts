import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes, type ProfileDto } from '@agency-os/contracts';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { IdentityRepository } from '../../infrastructure/repositories/identity.repository';
import type { UpdateProfileDto } from '../../interface/http/dto/profile.dto';

const blankToNull = (value: string | null | undefined) =>
  value === undefined ? undefined : value?.trim() || null;

@Injectable()
export class ProfileService {
  constructor(
    private readonly identity: IdentityRepository,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string): Promise<ProfileDto> {
    const profile = await this.identity.findProfile(userId);
    if (!profile)
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    return profile;
  }

  async update(
    user: AuthenticatedUser,
    dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    const before = await this.get(user.userId);
    const after = await this.identity.updateProfile(user.userId, {
      firstName: dto.firstName?.trim(),
      lastName: blankToNull(dto.lastName),
      jobTitle: blankToNull(dto.jobTitle),
    });
    if (user.organizationId) {
      await this.audit.record({
        organizationId: user.organizationId,
        actorId: user.userId,
        actorType: 'user',
        action: 'user.profile_update',
        entityType: 'user',
        entityId: user.userId,
        before: { ...before },
        after: { ...after },
      });
    }
    return after;
  }
}
