import { Global, Module } from '@nestjs/common';
import { DomainEventBus } from './domain-event.bus';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxService } from './outbox.service';

@Global()
@Module({
  providers: [OutboxService, OutboxRelayService, DomainEventBus],
  exports: [OutboxService, DomainEventBus],
})
export class EventsModule {}
