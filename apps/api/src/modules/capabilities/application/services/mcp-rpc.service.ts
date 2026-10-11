import { Injectable } from '@nestjs/common';
import { Permissions } from '@agency-os/contracts';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { CapabilityExecutorService } from './capability-executor.service';
import { CapabilityRegistryService } from './capability-registry.service';
import { MCP_PROTOCOL_VERSION, toMcpTools } from '../utils/mcp-tool-mapper';

export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

const MCP_SERVER_INFO = {
  name: 'whizsuite-capabilities',
  version: '1.0.0',
};

/** Shared JSON-RPC handler for MCP POST and MCP-over-SSE transports. */
@Injectable()
export class McpRpcService {
  constructor(
    private readonly registry: CapabilityRegistryService,
    private readonly executor: CapabilityExecutorService,
  ) {}

  async handle(
    organizationId: string,
    user: AuthenticatedUser,
    body: McpJsonRpcRequest,
  ): Promise<McpJsonRpcResponse> {
    switch (body.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: MCP_SERVER_INFO,
          },
        };
      case 'ping':
        return { jsonrpc: '2.0', id: body.id, result: {} };
      case 'tools/list': {
        const tools = await this.registry.listForUserCached(
          organizationId,
          user.userId,
          user.permissions ?? [],
        );
        return {
          jsonrpc: '2.0',
          id: body.id,
          result: { tools: toMcpTools(tools) },
        };
      }
      case 'tools/call': {
        const name = body.params?.name as string;
        const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
        const result = await this.executor.execute(organizationId, user, {
          toolId: name,
          input: args,
          runId: body.params?.runId as string | undefined,
        });
        const isError =
          typeof result === 'object' &&
          result !== null &&
          'status' in result &&
          (result as { status: string }).status === 'error';
        return {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result) }],
            ...(isError ? { isError: true } : {}),
          },
        };
      }
      case 'tools/call_batch': {
        const runId = body.params?.runId as string | undefined;
        const rawCalls = body.params?.calls;
        const calls = Array.isArray(rawCalls)
          ? rawCalls
              .filter(
                (row): row is Record<string, unknown> =>
                  !!row && typeof row === 'object',
              )
              .map((row) => ({
                toolId: typeof row.name === 'string' ? row.name : '',
                input: (row.arguments ?? {}) as Record<string, unknown>,
                runId,
              }))
              .filter((call) => call.toolId.length > 0)
          : [];
        const results = await this.executor.executeBatch(
          organizationId,
          user,
          calls,
        );
        return {
          jsonrpc: '2.0',
          id: body.id,
          result: { results },
        };
      }
      default:
        return {
          jsonrpc: '2.0',
          id: body.id,
          error: { code: -32601, message: `Method not found: ${body.method}` },
        };
    }
  }

  /** Minimum permission for any MCP session (matches AI_CHAT). */
  static requiredPermission = Permissions.AI_CHAT;
}
