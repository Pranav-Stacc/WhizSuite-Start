import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant.context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? randomUUID();
    res.setHeader('x-correlation-id', correlationId);

    const orgHeader = req.headers['x-organization-id'] as string | undefined;
    const orgFromParams = req.params['orgId'] as string | undefined;

    TenantContext.run(
      {
        organizationId: orgHeader ?? orgFromParams ?? '',
        correlationId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      () => next(),
    );
  }
}
