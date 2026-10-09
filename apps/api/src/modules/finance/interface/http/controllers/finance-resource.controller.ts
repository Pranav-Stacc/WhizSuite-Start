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
import { FinanceService } from '../../../application/services/finance.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceResourceController {
  constructor(private readonly service: FinanceService) {}

  @Get()
  @RequirePermissions(Permissions.INVOICES_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.INVOICES_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.INVOICES_VIEW)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.INVOICES_CREATE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInvoiceDto,
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
  @RequirePermissions(Permissions.INVOICES_CREATE)
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
