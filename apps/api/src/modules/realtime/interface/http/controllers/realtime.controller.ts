import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { REALTIME_NAMESPACE, RealtimeEvents } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { AllowAuthenticated } from '../../../../../shared/auth/allow-authenticated.decorator';

@ApiTags('realtime')
@ApiBearerAuth()
@AllowAuthenticated()
@Controller('v1/realtime')
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  @Get('status')
  status() {
    return {
      websocketNamespace: REALTIME_NAMESPACE,
      events: Object.values(RealtimeEvents),
      status: 'ok',
    };
  }
}
