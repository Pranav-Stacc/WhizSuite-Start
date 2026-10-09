import { Injectable, OnModuleInit } from '@nestjs/common';
import type { EventEnvelope } from '@agency-os/contracts';
import { DomainEventBus } from '../../../../shared/events/domain-event.bus';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly eventBus: DomainEventBus,
  ) {}

  onModuleInit(): void {
    const types = [
      'task.assigned.v1',
      'approval.requested.v1',
      'content.scheduled.v1',
      'social_post.published.v1',
      'social_post.failed.v1',
      'invitation.sent.v1',
    ];
    for (const type of types) {
      this.eventBus.subscribe(type, (event) => this.handleDomainEvent(event));
    }
  }

  list(organizationId: string, recipientId: string) {
    return this.repository.listForUser(organizationId, recipientId);
  }

  markRead(
    organizationId: string,
    notificationId: string,
    recipientId: string,
  ) {
    return this.repository.markRead(
      organizationId,
      notificationId,
      recipientId,
    );
  }

  private async handleDomainEvent(event: EventEnvelope): Promise<void> {
    if (event.actor.type !== 'user') return;
    await this.repository.create({
      organizationId: event.organizationId,
      recipientId: event.actor.id,
      typeKey: event.type,
      title: event.type,
      body: '',
      data: event.payload,
    });
  }
}
