import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(organizationId: string, recipientId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { organizationId, recipientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  create(data: {
    organizationId: string;
    recipientId: string;
    typeKey: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        recipientId: data.recipientId,
        typeKey: data.typeKey,
        title: data.title,
        body: data.body,
        data: toInputJson(data.data),
      },
    });
  }

  markRead(organizationId: string, id: string, recipientId: string) {
    return this.prisma.notification.updateMany({
      where: { id, organizationId, recipientId },
      data: { readAt: new Date() },
    });
  }
}
