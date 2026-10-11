import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  organizationName!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  organizationSlug!: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from GIS or google_sign_in' })
  @IsString()
  @MinLength(1)
  idToken!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  organizationName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  organizationSlug?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;
}
