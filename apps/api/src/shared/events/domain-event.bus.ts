import { Injectable, Logger } from '@nestjs/common';
import type { EventEnvelope } from '@agency-os/contracts';

type EventHandler = (event: EventEnvelope) => Promise<void> | void;

@Injectable()
export class DomainEventBus {
  private readonly logger = new Logger(DomainEventBus.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe(eventType: string, handler: EventHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  async publish(event: EventEnvelope): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    this.logger.debug(`Publishing ${event.type} to ${handlers.length} handlers`);
    for (const handler of handlers) {
      await handler(event);
    }
  }
}
