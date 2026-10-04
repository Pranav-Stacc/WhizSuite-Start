import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('v1/realtime')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RealtimeController {
  @Get('status')
  @RequirePermissions(Permissions.ORG_VIEW)
  status() {
    return {
      websocketNamespace: '/realtime',
      events: ['connected', 'pong'],
      status: 'ok',
    };
  }
}
