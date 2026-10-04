import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class RealtimeRepository {
  constructor(private readonly prisma: PrismaService) {}
}
