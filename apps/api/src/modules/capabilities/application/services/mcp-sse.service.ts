import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import type { McpJsonRpcRequest, McpJsonRpcResponse } from './mcp-rpc.service';
import { McpRpcService } from './mcp-rpc.service';

interface McpSseSession {
  organizationId: string;
  userId: string;
  res: Response;
  createdAt: number;
}

/** MCP HTTP+SSE transport: long-lived SSE stream + POST message endpoint (spec 2024-11-05). */
@Injectable()
export class McpSseService implements OnModuleDestroy {
  private readonly logger = new Logger(McpSseService.name);
  private readonly sessions = new Map<string, McpSseSession>();
  private readonly ttlMs = 30 * 60 * 1000;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly rpc: McpRpcService) {
    this.sweepTimer = setInterval(() => this.sweepStaleSessions(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    for (const session of this.sessions.values()) {
      try {
        session.res.end();
      } catch {
        /* connection may already be closed */
      }
    }
    this.sessions.clear();
  }

  openSession(
    organizationId: string,
    user: AuthenticatedUser,
    res: Response,
    messagesBasePath: string,
  ): string {
    const sessionId = randomUUID();
    const messagesPath = `${messagesBasePath}?sessionId=${sessionId}`;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    this.sessions.set(sessionId, {
      organizationId,
      userId: user.userId,
      res,
      createdAt: Date.now(),
    });

    // MCP SSE transport: first event tells the client where to POST JSON-RPC messages.
    this.writeSse(res, 'endpoint', messagesPath);
    this.writeSse(res, 'message', {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    });

    res.on('close', () => {
      this.sessions.delete(sessionId);
    });

    return sessionId;
  }

  async postMessage(
    sessionId: string,
    organizationId: string,
    user: AuthenticatedUser,
    body: McpJsonRpcRequest,
  ): Promise<{ accepted: boolean }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('MCP SSE session not found or expired');
    }
    if (
      session.organizationId !== organizationId ||
      session.userId !== user.userId
    ) {
      throw new BadRequestException('MCP SSE session scope mismatch');
    }

    const response = await this.rpc.handle(organizationId, user, body);
    this.writeSse(session.res, 'message', response);
    return { accepted: true };
  }

  private writeSse(
    res: Response,
    event: string,
    data: string | McpJsonRpcResponse | Record<string, unknown>,
  ): void {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    res.write(`event: ${event}\n`);
    res.write(`data: ${payload}\n\n`);
  }

  private sweepStaleSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.createdAt > this.ttlMs) {
        try {
          session.res.end();
        } catch {
          /* ignore */
        }
        this.sessions.delete(id);
        this.logger.debug(`Expired MCP SSE session ${id}`);
      }
    }
  }
}
