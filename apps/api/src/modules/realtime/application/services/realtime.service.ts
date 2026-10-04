import { Injectable } from '@nestjs/common';
import { RealtimeRepository } from '../../infrastructure/repositories/realtime.repository';

@Injectable()
export class RealtimeService {
  constructor(private readonly repository: RealtimeRepository) {}

  getHealth() {
    return { module: 'realtime', status: 'ok' };
  }
}
