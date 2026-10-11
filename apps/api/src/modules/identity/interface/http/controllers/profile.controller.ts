import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { AllowAuthenticated } from '../../../../../shared/auth/allow-authenticated.decorator';
import { ProfileService } from '../../../application/services/profile.service';
import { UpdateProfileDto } from '../dto/profile.dto';

@ApiTags('profile')
@ApiBearerAuth()
@AllowAuthenticated()
@Controller('v1/me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.profile.get(user.userId);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profile.update(user, dto);
  }
}
