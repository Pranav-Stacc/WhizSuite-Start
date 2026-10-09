import { Injectable } from '@nestjs/common';
import { IdentityRepository } from '../../infrastructure/repositories/identity.repository';
import type { UserContact } from '../ports/identity.port';

/** Public read port of the identity domain for other modules. */
@Injectable()
export class IdentityService {
  constructor(private readonly repository: IdentityRepository) {}

  async findContact(userId: string): Promise<UserContact | null> {
    const user = await this.repository.findUserById(userId);
    return user
      ? { id: user.id, email: user.email, firstName: user.firstName }
      : null;
  }
}
