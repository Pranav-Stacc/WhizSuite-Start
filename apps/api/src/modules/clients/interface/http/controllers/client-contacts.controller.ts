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
import { ClientsService } from '../../../application/services/clients.service';
import {
  CreateClientContactDto,
  UpdateClientContactDto,
} from '../dto/client-contact.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/client-contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientContactsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @RequirePermissions(Permissions.CLIENTS_VIEW)
  list(
    @Param('organizationId') organizationId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.clients.listContacts(
      requireOrganizationId(organizationId),
      clientId,
    );
  }

  @Post()
  @RequirePermissions(Permissions.CLIENTS_EDIT)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateClientContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clients.createContact(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Patch(':contactId')
  @RequirePermissions(Permissions.CLIENTS_EDIT)
  update(
    @Param('organizationId') organizationId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() body: UpdateClientContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clients.updateContact(
      requireOrganizationId(organizationId),
      contactId,
      user.userId,
      body,
    );
  }

  @Delete(':contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.CLIENTS_EDIT)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clients.deleteContact(
      requireOrganizationId(organizationId),
      contactId,
      user.userId,
    );
  }
}
