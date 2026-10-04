import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class AiRepository {
  constructor(private readonly prisma: PrismaService) {}
}
