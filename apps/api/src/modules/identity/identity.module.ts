import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AccessModule } from '../access/access.module';
import { AuthService } from './application/services/auth.service';
import { MembersService } from './application/services/members.service';
import { ProfileService } from './application/services/profile.service';
import { IdentityRepository } from './infrastructure/repositories/identity.repository';
import { JwtStrategy } from './infrastructure/auth/jwt.strategy';
import { AuthController } from './interface/http/controllers/auth.controller';
import { MembersController } from './interface/http/controllers/members.controller';
import { ProfileController } from './interface/http/controllers/profile.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    AccessModule,
  ],
  controllers: [AuthController, MembersController, ProfileController],
  providers: [
    AuthService,
    MembersService,
    ProfileService,
    IdentityRepository,
    JwtStrategy,
  ],
  exports: [AuthService, IdentityRepository],
})
export class IdentityModule {}
