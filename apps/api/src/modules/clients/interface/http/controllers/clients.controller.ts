import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { ClientsService } from '../../../application/services/clients.service';
import { CreateClientDto, UpdateBrandKitDto } from '../dto/client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @RequirePermissions(Permissions.CLIENTS_VIEW)
  list(
    @Param('organizationId') organizationId: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.clients.list(organizationId, workspaceId);
  }

  @Get(':clientId')
  @RequirePermissions(Permissions.CLIENTS_VIEW)
  get(
    @Param('organizationId') organizationId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.clients.get(organizationId, clientId);
  }

  @Post()
  @RequirePermissions(Permissions.CLIENTS_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clients.create(organizationId, user.userId, dto);
  }

  @Patch(':clientId/brand-kit')
  @RequirePermissions(Permissions.CLIENTS_EDIT)
  updateBrandKit(
    @Param('organizationId') organizationId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateBrandKitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clients.updateBrandKit(
      organizationId,
      clientId,
      user.userId,
      dto,
    );
  }
}
