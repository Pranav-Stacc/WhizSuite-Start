import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../../shared/shared.module';
import { AccessModule } from '../access/access.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AuthEmailService } from './application/services/auth-email.service';
import { AuthService } from './application/services/auth.service';
import { IdentityService } from './application/services/identity.service';
import { MembersService } from './application/services/members.service';
import { ProfileService } from './application/services/profile.service';
import { IdentityRepository } from './infrastructure/repositories/identity.repository';
import { GoogleIdTokenVerifier } from './infrastructure/auth/google-id-token.verifier';
import { JwtStrategy } from './infrastructure/auth/jwt.strategy';
import { AuthController } from './interface/http/controllers/auth.controller';
import { MembersController } from './interface/http/controllers/members.controller';
import { ProfileController } from './interface/http/controllers/profile.controller';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    AccessModule,
    TenancyModule,
  ],
  controllers: [AuthController, MembersController, ProfileController],
  providers: [
    AuthService,
    AuthEmailService,
    IdentityService,
    MembersService,
    ProfileService,
    IdentityRepository,
    GoogleIdTokenVerifier,
    JwtStrategy,
  ],
  exports: [AuthService, AuthEmailService, IdentityService, IdentityRepository, MembersService],
})
export class IdentityModule {}
