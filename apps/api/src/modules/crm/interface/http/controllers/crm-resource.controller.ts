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
import { CrmService } from '../../../application/services/crm.service';
import { CreateLeadDto, UpdateLeadDto } from '../dto/lead.dto';

@ApiTags('crm')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmResourceController {
  constructor(private readonly service: CrmService) {}

  @Get()
  @RequirePermissions(Permissions.LEADS_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.LEADS_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.LEADS_VIEW)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.LEADS_CREATE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLeadDto,
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
  @RequirePermissions(Permissions.LEADS_CREATE)
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
