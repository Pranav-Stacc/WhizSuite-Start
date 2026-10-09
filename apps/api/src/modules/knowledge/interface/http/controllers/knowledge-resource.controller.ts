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
import { KnowledgeService } from '../../../application/services/knowledge.service';
import { CreateArticleDto, UpdateArticleDto } from '../dto/article.dto';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/knowledge/articles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KnowledgeResourceController {
  constructor(private readonly service: KnowledgeService) {}

  @Get()
  @RequirePermissions(Permissions.ORG_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.ORG_VIEW)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      body,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(
      requireOrganizationId(organizationId),
      user.userId,
      id,
    );
  }
}
