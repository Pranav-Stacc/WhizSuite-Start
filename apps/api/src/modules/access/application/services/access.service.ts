import { Injectable } from '@nestjs/common';
import { AccessRepository } from '../../infrastructure/repositories/access.repository';

@Injectable()
export class AccessService {
  constructor(private readonly repository: AccessRepository) {}

  getHealth() {
    return { module: 'access', status: 'ok' };
  }
}
