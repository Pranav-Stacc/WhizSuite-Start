import { Module } from '@nestjs/common';
import { RealtimeService } from './application/services/realtime.service';
import { RealtimeRepository } from './infrastructure/repositories/realtime.repository';
import { RealtimeController } from './interface/http/controllers/realtime.controller';
import { RealtimeGateway } from './interface/ws/realtime.gateway';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeRepository, RealtimeGateway],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
