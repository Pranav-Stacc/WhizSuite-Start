import { Injectable } from '@nestjs/common';
import { IdentityRepository } from '../../infrastructure/repositories/identity.repository';

@Injectable()
export class IdentityService {
  constructor(private readonly repository: IdentityRepository) {}

  getHealth() {
    return { module: 'identity', status: 'ok' };
  }
}
