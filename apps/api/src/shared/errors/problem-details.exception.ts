import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@agency-os/contracts';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: ErrorCode;
  errors?: Array<{ field: string; message: string }>;
  correlationId?: string;
}

export class ProblemDetailsException extends HttpException {
  constructor(
    public readonly problem: ProblemDetails,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(problem, status);
  }
}

export function problem(
  status: HttpStatus,
  title: string,
  code: ErrorCode,
  detail?: string,
): ProblemDetailsException {
  return new ProblemDetailsException(
    { type: 'about:blank', title, status, code, detail },
    status,
  );
}
