import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeService } from './application/services/realtime.service';
import { RealtimeController } from './interface/http/controllers/realtime.controller';
import { RealtimeGateway } from './interface/ws/realtime.gateway';

@Module({
  imports: [JwtModule.register({})],
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeGateway],
  exports: [RealtimeService],
})
export class RealtimeModule {}
