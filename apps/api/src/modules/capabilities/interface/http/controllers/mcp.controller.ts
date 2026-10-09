import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { CapabilityExecutorService } from '../../../application/services/capability-executor.service';
import { CapabilityRegistryService } from '../../../application/services/capability-registry.service';

interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/** MCP-compatible JSON-RPC endpoint over the capability registry. */
@ApiTags('mcp')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/mcp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class McpController {
  constructor(
    private readonly registry: CapabilityRegistryService,
    private readonly executor: CapabilityExecutorService,
  ) {}

  @Post()
  @RequirePermissions(Permissions.AI_CHAT)
  async handle(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: McpJsonRpcRequest,
  ) {
    const orgId = requireOrganizationId(organizationId);
    const tools = this.registry.listForUser(user.permissions ?? []);

    switch (body.method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: body.id,
          result: { tools },
        };
      case 'tools/call': {
        const name = body.params?.name as string;
        const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
        const result = await this.executor.execute(orgId, user, {
          toolId: name,
          input: args,
          runId: body.params?.runId as string | undefined,
        });
        return {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          },
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
}
