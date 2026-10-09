import { Injectable } from '@nestjs/common';
import type { InboxConversation, InboxMessage } from '@prisma/client';
import type {
  InboxConversationStatus,
  InboxConversationType,
  InboxMessageDirection,
  InboxPriority,
  InboxSentiment,
} from '@agency-os/contracts';
import { PrismaService } from '../../../../shared/database/prisma.service';

export type ConversationRecord = InboxConversation & {
  messages: InboxMessage[];
};

export interface ConversationCreateRow {
  clientId: string;
  type: InboxConversationType;
  status: InboxConversationStatus;
  authorHandle?: string;
  priority?: InboxPriority;
  sentiment?: InboxSentiment;
  slaDueAt?: Date;
}

export interface ConversationUpdateRow {
  status?: InboxConversationStatus;
  assigneeId?: string | null;
  priority?: InboxPriority;
  sentiment?: InboxSentiment;
  firstResponseAt?: Date;
  resolvedAt?: Date | null;
}

export interface MessageCreateRow {
  direction: InboxMessageDirection;
  body: string;
  authorType: 'user' | 'external';
  authorId?: string;
}

const LATEST_MESSAGE = { orderBy: { createdAt: 'desc' as const }, take: 1 };
const ALL_MESSAGES = { orderBy: { createdAt: 'asc' as const } };

@Injectable()
export class EngagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    limit: number,
    clientIds?: string[],
  ): Promise<ConversationRecord[]> {
    return this.prisma.inboxConversation.findMany({
      where: {
        organizationId,
        ...(clientIds ? { clientId: { in: clientIds } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { messages: LATEST_MESSAGE },
    });
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<ConversationRecord | null> {
    return this.prisma.inboxConversation.findFirst({
      where: { id, organizationId },
      include: { messages: ALL_MESSAGES },
    });
  }

  create(
    organizationId: string,
    row: ConversationCreateRow,
    firstMessage?: MessageCreateRow,
  ) {
    return this.prisma.inboxConversation.create({
      data: {
        organizationId,
        ...row,
        ...(firstMessage
          ? { messages: { create: { organizationId, ...firstMessage } } }
          : {}),
      },
    });
  }

  update(organizationId: string, id: string, row: ConversationUpdateRow) {
    return this.prisma.inboxConversation.updateMany({
      where: { id, organizationId },
      data: row,
    });
  }

  addMessage(
    organizationId: string,
    conversationId: string,
    message: MessageCreateRow,
    row: ConversationUpdateRow,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.inboxMessage.create({
        data: { organizationId, conversationId, ...message },
      });
      await tx.inboxConversation.updateMany({
        where: { id: conversationId, organizationId },
        data: row,
      });
      return created;
    });
  }
}
