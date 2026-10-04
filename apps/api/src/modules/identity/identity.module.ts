import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AccessModule } from '../access/access.module';
import { AuthService } from './application/services/auth.service';
import { IdentityRepository } from './infrastructure/repositories/identity.repository';
import { JwtStrategy } from './infrastructure/auth/jwt.strategy';
import { AuthController } from './interface/http/controllers/auth.controller';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    AccessModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, IdentityRepository, JwtStrategy],
  exports: [AuthService, IdentityRepository],
})
export class IdentityModule {}
