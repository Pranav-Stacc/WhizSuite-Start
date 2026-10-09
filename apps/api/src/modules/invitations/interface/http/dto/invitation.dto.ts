import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '@agency-os/contracts';
import {
  INVITABLE_MEMBERSHIP_TYPES,
  type InvitableMembershipType,
} from '../../../../access/config/default-roles';

const CLIENT_MEMBERSHIP: InvitableMembershipType = 'CLIENT';
const MAX_INVITATION_HOURS = 24 * 30;
const NAME_MAX_LENGTH = 100;
const TOKEN_MAX_LENGTH = 128;

export class CreateInvitationDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: INVITABLE_MEMBERSHIP_TYPES })
  @IsIn(INVITABLE_MEMBERSHIP_TYPES)
  membershipType!: InvitableMembershipType;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Defaults to the system role for the membership type',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiProperty({
    required: false,
    description: 'Required for CLIENT invitations',
  })
  @ValidateIf(
    (dto: CreateInvitationDto) =>
      dto.membershipType === CLIENT_MEMBERSHIP || dto.clientId !== undefined,
  )
  @IsUUID()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INVITATION_HOURS)
  expiresInHours?: number;
}

export class InvitationTokenQuery {
  @ApiProperty()
  @IsString()
  @MaxLength(TOKEN_MAX_LENGTH)
  token!: string;
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(TOKEN_MAX_LENGTH)
  token!: string;
}

export class RedeemInvitationDto extends AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @ApiProperty({
    required: false,
    description: 'Required when no account exists for the invited email',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(NAME_MAX_LENGTH)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(NAME_MAX_LENGTH)
  lastName?: string;
}
