import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { SearchService } from '../../../application/services/search.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/search')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @RequirePermissions(Permissions.ORG_VIEW)
  search(
    @Param('organizationId') organizationId: string,
    @Query('q') query = '',
  ) {
    return this.service.search(requireOrganizationId(organizationId), query);
  }
}
