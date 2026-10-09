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
  Query,
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
import { WorkService } from '../../../application/services/work.service';
import {
  CreateTaskDto,
  TransitionTaskDto,
  UpdateTaskDto,
} from '../dto/task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly work: WorkService) {}

  @Get()
  @RequirePermissions(Permissions.TASKS_VIEW)
  list(
    @Param('organizationId') organizationId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.work.listTasks(
      requireOrganizationId(organizationId),
      projectId,
    );
  }

  @Get(':taskId')
  @RequirePermissions(Permissions.TASKS_VIEW)
  get(
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.work.getTask(requireOrganizationId(organizationId), taskId);
  }

  @Post()
  @RequirePermissions(Permissions.TASKS_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.work.createTask(
      requireOrganizationId(organizationId),
      user.userId,
      dto,
    );
  }

  @Patch(':taskId')
  @RequirePermissions(Permissions.TASKS_EDIT)
  update(
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.work.updateTask(
      requireOrganizationId(organizationId),
      user.userId,
      taskId,
      dto,
    );
  }

  @Post(':taskId/transition')
  @RequirePermissions(Permissions.TASKS_TRANSITION)
  transition(
    @Param('organizationId') organizationId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: TransitionTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.work.transitionTask(
      requireOrganizationId(organizationId),
      user.userId,
      taskId,
      dto.toStatus,
    );
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.TASKS_DELETE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.work.deleteTask(
      requireOrganizationId(organizationId),
      user.userId,
      taskId,
    );
  }
}
