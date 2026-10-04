import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ErrorCodes } from '@agency-os/contracts';
import type { Request, Response } from 'express';
import { TenantContext } from '../tenant/tenant.context';
import { ProblemDetailsException } from './problem-details.exception';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ProblemDetailsException) {
      const problem = {
        ...exception.problem,
        instance: request.url,
        correlationId: TenantContext.getCorrelationId(),
      };
      response.status(exception.getStatus()).json(problem);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json({
        type: 'about:blank',
        title: HttpStatus[status] ?? 'Error',
        status,
        detail:
          typeof body === 'string'
            ? body
            : ((body as { message?: string | string[] }).message ??
              exception.message),
        instance: request.url,
        code: ErrorCodes.INTERNAL_ERROR,
        correlationId: TenantContext.getCorrelationId(),
      });
      return;
    }

    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.INTERNAL_ERROR,
      instance: request.url,
      correlationId: TenantContext.getCorrelationId(),
    });
  }
}
