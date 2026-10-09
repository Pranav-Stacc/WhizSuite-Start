import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { WorkflowEngineService } from '../../../application/services/workflow-engine.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto/workflow.dto';

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
    @Body() body: CreateWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflows.createDefinition(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Get('versions/:versionId')
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  getVersion(
    @Param('organizationId') organizationId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.workflows.getVersion(
      requireOrganizationId(organizationId),
      versionId,
    );
  }

  @Post('versions/:versionId/publish')
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  publish(
    @Param('organizationId') organizationId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.workflows.publishVersion(
      requireOrganizationId(organizationId),
      versionId,
    );
  }

  @Post('versions/:versionId/can-transition')
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  canTransition(
    @Param('organizationId') organizationId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
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

  @Get(':id')
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflows.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflows.updateDefinition(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      body,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.WORKFLOWS_MANAGE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflows.deleteDefinition(
      requireOrganizationId(organizationId),
      user.userId,
      id,
    );
  }
}
