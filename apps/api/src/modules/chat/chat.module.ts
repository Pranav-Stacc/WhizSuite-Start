import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChatService } from './application/services/chat.service';
import { ChatRepository } from './infrastructure/repositories/chat.repository';
import { ChatController } from './interface/http/controllers/chat.controller';

@Module({
  imports: [RealtimeModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository],
  exports: [ChatService],
})
export class ChatModule {}
