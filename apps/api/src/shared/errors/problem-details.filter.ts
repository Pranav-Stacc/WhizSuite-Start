import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ErrorCodes, type ErrorCode } from '@agency-os/contracts';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { TenantContext } from '../tenant/tenant.context';
import { ProblemDetailsException } from './problem-details.exception';

const STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCodes.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCodes.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCodes.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCodes.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCodes.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCodes.VALIDATION_FAILED,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCodes.RATE_LIMITED,
};

/** Prisma known-request error codes that describe a client mistake rather than a server fault. */
const PRISMA_ERRORS: Record<
  string,
  { status: HttpStatus; code: ErrorCode; detail: string }
> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    code: ErrorCodes.CONFLICT,
    detail: 'A record with these values already exists',
  },
  P2003: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: ErrorCodes.VALIDATION_FAILED,
    detail: 'A referenced record does not exist',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    code: ErrorCodes.NOT_FOUND,
    detail: 'Record not found',
  },
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const meta = {
      instance: request.url,
      correlationId: TenantContext.getCorrelationId(),
    };

    if (exception instanceof ProblemDetailsException) {
      response
        .status(exception.getStatus())
        .json({ ...exception.problem, ...meta });
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
        code: STATUS_CODES[status] ?? ErrorCodes.INTERNAL_ERROR,
        ...meta,
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERRORS[exception.code];
      if (mapped) {
        response.status(mapped.status).json({
          type: 'about:blank',
          title: HttpStatus[mapped.status],
          status: mapped.status,
          code: mapped.code,
          detail: mapped.detail,
          ...meta,
        });
        return;
      }
    }

    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.INTERNAL_ERROR,
      ...meta,
    });
  }
}
