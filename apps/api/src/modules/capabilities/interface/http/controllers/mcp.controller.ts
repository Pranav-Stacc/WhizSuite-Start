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
import {
  McpRpcService,
  type McpJsonRpcRequest,
} from '../../../application/services/mcp-rpc.service';

/** Stateless MCP JSON-RPC over HTTP POST (tools/list, tools/call, …). */
@ApiTags('mcp')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/mcp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class McpController {
  constructor(private readonly rpc: McpRpcService) {}

  @Post()
  @RequirePermissions(Permissions.AI_CHAT)
  async handle(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: McpJsonRpcRequest,
  ) {
    const orgId = requireOrganizationId(organizationId);
    return this.rpc.handle(orgId, user, body);
  }
}
