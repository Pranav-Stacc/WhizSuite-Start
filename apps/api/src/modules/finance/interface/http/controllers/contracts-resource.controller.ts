import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Permissions,
  presignContractUploadSchema,
  signContractSchema,
} from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { FinanceService } from '../../../application/services/finance.service';
import {
  CreateContractDto,
  ListContractsQueryDto,
  UpdateContractDto,
} from '../dto/contract.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractsResourceController {
  constructor(private readonly service: FinanceService) {}

  @Get()
  @RequirePermissions(Permissions.INVOICES_VIEW)
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListContractsQueryDto,
  ) {
    return this.service.listContracts(
      requireOrganizationId(organizationId),
      query.clientId,
    );
  }

  @Post()
  @RequirePermissions(Permissions.INVOICES_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createContract(
      requireOrganizationId(organizationId),
      user.userId,
      {
        ...body,
        type: body.type ?? 'OTHER',
      },
    );
  }

  @Patch(':id')
  @RequirePermissions(Permissions.INVOICES_CREATE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateContract(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      body,
    );
  }

  @Post(':id/presign-upload')
  @RequirePermissions(Permissions.INVOICES_CREATE)
  presignUpload(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const input = presignContractUploadSchema.parse(body);
    return this.service.presignContractUpload(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      input,
    );
  }

  @Post(':id/complete-upload')
  @RequirePermissions(Permissions.INVOICES_CREATE)
  completeUpload(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.completeContractUpload(
      requireOrganizationId(organizationId),
      user.userId,
      id,
    );
  }

  @Post(':id/sign')
  @RequirePermissions(Permissions.INVOICES_VIEW)
  sign(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const input = signContractSchema.parse(body);
    return this.service.signContract(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      input,
    );
  }

  @Get(':id/download')
  @RequirePermissions(Permissions.INVOICES_VIEW)
  download(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.contractDownloadUrl(
      requireOrganizationId(organizationId),
      id,
    );
  }
}
