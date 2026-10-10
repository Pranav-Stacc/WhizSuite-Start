import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions, sendAgentMessageSchema } from '@agency-os/contracts';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { AgentRunService } from '../../../application/services/agent-run.service';
import { AgentSessionService } from '../../../application/services/agent-session.service';

@ApiTags('agent')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/agent')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AgentController {
  constructor(
    private readonly sessions: AgentSessionService,
    private readonly runs: AgentRunService,
  ) {}

  @Get('sessions')
  @RequirePermissions(Permissions.AI_VIEW)
  listSessions(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessions.listSessions(
      requireOrganizationId(organizationId),
      user.userId,
    );
  }

  @Post('sessions')
  @RequirePermissions(Permissions.AI_CHAT)
  createSession(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { title?: string },
  ) {
    return this.sessions.createSession(
      requireOrganizationId(organizationId),
      user.userId,
      body.title,
    );
  }

  /** Reuse the main Whiz thread instead of creating a new session on every open. */
  @Post('sessions/open')
  @RequirePermissions(Permissions.AI_CHAT)
  openSession(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { title?: string },
  ) {
    return this.sessions.getOrCreateSession(
      requireOrganizationId(organizationId),
      user.userId,
      body.title?.trim() || 'Whiz',
    );
  }

  @Get('sessions/:sessionId')
  @RequirePermissions(Permissions.AI_VIEW)
  getSession(
    @Param('organizationId') organizationId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessions.getSession(
      requireOrganizationId(organizationId),
      sessionId,
    );
  }

  @Post('sessions/:sessionId/messages')
  @RequirePermissions(Permissions.AI_CHAT)
  sendMessage(
    @Param('organizationId') organizationId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = sendAgentMessageSchema.parse(body);
    return this.runs.sendMessage(
      requireOrganizationId(organizationId),
      user,
      sessionId,
      input,
    );
  }

  @Post('sessions/:sessionId/messages/stream')
  @RequirePermissions(Permissions.AI_CHAT)
  async streamMessage(
    @Param('organizationId') organizationId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const input = sendAgentMessageSchema.parse(body);
    const orgId = requireOrganizationId(organizationId);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const write = (event: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(event)}

`);
    };

    try {
      await this.runs.sendMessageStream(orgId, user, sessionId, input, write);
    } catch (error) {
      write({
        type: 'error',
        message: error instanceof Error ? error.message : 'Agent stream failed',
      });
    } finally {
      res.end();
    }
  }

  @Get('runs')
  @RequirePermissions(Permissions.AI_VIEW)
  listRuns(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.runs.listRuns(
      requireOrganizationId(organizationId),
      user.userId,
    );
  }

  @Get('runs/:runId')
  @RequirePermissions(Permissions.AI_VIEW)
  getRun(
    @Param('organizationId') organizationId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
  ) {
    return this.runs.getRun(requireOrganizationId(organizationId), runId);
  }

  @Get('pending')
  @RequirePermissions(Permissions.AI_VIEW)
  listPending(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.runs.listPending(
      requireOrganizationId(organizationId),
      user.userId,
    );
  }

  @Post('pending/:pendingId/confirm')
  @RequirePermissions(Permissions.AI_CHAT)
  confirmPending(
    @Param('organizationId') organizationId: string,
    @Param('pendingId', ParseUUIDPipe) pendingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.runs.confirmPending(
      requireOrganizationId(organizationId),
      user,
      pendingId,
    );
  }

  @Post('pending/:pendingId/reject')
  @RequirePermissions(Permissions.AI_CHAT)
  rejectPending(
    @Param('organizationId') organizationId: string,
    @Param('pendingId', ParseUUIDPipe) pendingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.runs.rejectPending(
      requireOrganizationId(organizationId),
      user.userId,
      pendingId,
    );
  }

  @Get('definitions')
  @RequirePermissions(Permissions.AI_CHAT)
  listDefinitions(@Param('organizationId') organizationId: string) {
    return this.runs.listDefinitions(requireOrganizationId(organizationId));
  }

  @Post('definitions')
  @RequirePermissions(Permissions.AI_CHAT)
  createDefinition(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.runs.createDefinition(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Get('schedules')
  @RequirePermissions(Permissions.AI_CHAT)
  listSchedules(@Param('organizationId') organizationId: string) {
    return this.runs.listSchedules(requireOrganizationId(organizationId));
  }

  @Post('schedules')
  @RequirePermissions(Permissions.AI_CHAT)
  createSchedule(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.runs.createSchedule(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Patch('schedules/:scheduleId')
  @RequirePermissions(Permissions.AI_AGENTS_MANAGE)
  updateSchedule(
    @Param('organizationId') organizationId: string,
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @Body() body: { status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' },
  ) {
    return this.runs.updateScheduleStatus(
      requireOrganizationId(organizationId),
      scheduleId,
      body.status,
    );
  }
}
