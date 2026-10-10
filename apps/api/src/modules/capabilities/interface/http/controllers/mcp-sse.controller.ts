import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { McpRpcService, type McpJsonRpcRequest } from '../../../application/services/mcp-rpc.service';
import { McpSseService } from '../../../application/services/mcp-sse.service';
import { Permissions } from '@agency-os/contracts';

/**
 * MCP HTTP+SSE transport (2024-11-05).
 * 1. GET  …/mcp/sse           → SSE stream; first event is `endpoint` with POST URL
 * 2. POST …/mcp/messages      → JSON-RPC request; response arrives on the SSE stream
 */
@ApiTags('mcp')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/mcp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class McpSseController {
  constructor(
    private readonly sse: McpSseService,
    private readonly rpc: McpRpcService,
  ) {}

  @Get('sse')
  @RequirePermissions(Permissions.AI_CHAT)
  openSse(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): void {
    const orgId = requireOrganizationId(organizationId);
    const messagesPath = `/api/v1/organizations/${orgId}/mcp/messages`;
    this.sse.openSession(orgId, user, res, messagesPath);
  }

  @Post('messages')
  @RequirePermissions(Permissions.AI_CHAT)
  async postMessage(
    @Param('organizationId') organizationId: string,
    @Query('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: McpJsonRpcRequest,
  ) {
    const orgId = requireOrganizationId(organizationId);
    if (!sessionId) {
      // Stateless JSON-RPC fallback (same as POST /mcp) for simple clients.
      return this.rpc.handle(orgId, user, body);
    }
    return this.sse.postMessage(sessionId, orgId, user, body);
  }
}
