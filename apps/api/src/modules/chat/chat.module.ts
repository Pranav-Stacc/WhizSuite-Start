import { Module, forwardRef } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChatService } from './application/services/chat.service';
import { ChatRepository } from './infrastructure/repositories/chat.repository';
import { ChatController } from './interface/http/controllers/chat.controller';

@Module({
  imports: [RealtimeModule, forwardRef(() => AgentModule)],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository],
  exports: [ChatService],
})
export class ChatModule {}
