import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { WorkflowEngineService } from '../../../application/services/workflow-engine.service';

@ApiTags('workflow-engine')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowEngineResourceController {
  constructor(private readonly workflows: WorkflowEngineService) {}

  @Get()
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  list(@Param('organizationId') organizationId: string) {
    return this.workflows.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflows.createDefinition(
      requireOrganizationId(organizationId),
      body as never,
    );
  }

  @Get('versions/:versionId')
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  getVersion(
    @Param('organizationId') organizationId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.workflows.getVersion(requireOrganizationId(organizationId), versionId);
  }

  @Post('versions/:versionId/publish')
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  publish(
    @Param('organizationId') organizationId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.workflows.publishVersion(requireOrganizationId(organizationId), versionId);
  }

  @Post('versions/:versionId/can-transition')
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  canTransition(
    @Param('organizationId') organizationId: string,
    @Param('versionId') versionId: string,
    @Body('fromState') fromState: string,
    @Body('toState') toState: string,
  ) {
    return this.workflows.canTransition(
      requireOrganizationId(organizationId),
      versionId,
      fromState,
      toState,
    );
  }
}
