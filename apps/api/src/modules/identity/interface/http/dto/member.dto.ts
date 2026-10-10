import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  ASSIGNABLE_SCOPE_TYPE_KEYS,
  EmploymentTypes,
  MEMBER_DESIGNATIONS_MAX,
  MemberDocumentTypes,
  MEMBER_PERMISSION_OVERRIDES_MAX,
  MEMBER_ROLES_MAX,
  PERMISSION_EFFECT_KEYS,
  PROFILE_JOB_TITLE_MAX_LENGTH,
  ROLE_SCOPES_MAX,
  type AssignableScopeType,
  type EmploymentType,
  type MemberDocumentType,
  type PermissionEffect,
} from '@agency-os/contracts';
import {
  STAFF_MEMBERSHIP_TYPES,
  type StaffMembershipType,
} from '../../../../access/config/default-roles';

export class UpdateMemberDto {
  @ApiProperty({ enum: STAFF_MEMBERSHIP_TYPES })
  @IsIn(STAFF_MEMBERSHIP_TYPES)
  membershipType!: StaffMembershipType;
}

export class RoleAssignmentScopeDto {
  @ApiProperty({ enum: ASSIGNABLE_SCOPE_TYPE_KEYS })
  @IsIn(ASSIGNABLE_SCOPE_TYPE_KEYS)
  scopeType!: AssignableScopeType;

  @ApiProperty({ required: false, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  resourceId?: string | null;
}

/** The complete set of roles the member should hold afterwards. */
export class AssignMemberRolesDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MEMBER_ROLES_MAX)
  @IsUUID('4', { each: true })
  roleIds!: string[];

  @ApiProperty({
    type: [RoleAssignmentScopeDto],
    required: false,
    description:
      'Data scopes applied to every role in this assignment. Defaults to ORGANIZATION.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROLE_SCOPES_MAX)
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentScopeDto)
  scopes?: RoleAssignmentScopeDto[];
}

export class SetMemberDesignationsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(MEMBER_DESIGNATIONS_MAX)
  @IsUUID('4', { each: true })
  designationIds!: string[];

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  primaryId?: string | null;
}

export class UpdateMemberProfileDto {
  @ApiProperty({ nullable: true })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(PROFILE_JOB_TITLE_MAX_LENGTH)
  title!: string | null;
}

export class UpdateMemberEmploymentDto {
  @ApiPropertyOptional({ enum: EmploymentTypes, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(EmploymentTypes)
  employmentType?: EmploymentType | null;
}

export class CreateMemberDocumentDto {
  @ApiProperty({ enum: MemberDocumentTypes })
  @IsIn(MemberDocumentTypes)
  type!: MemberDocumentType;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  templateId?: string | null;
}

export class MemberPermissionOverrideDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty({ enum: PERMISSION_EFFECT_KEYS })
  @IsIn(PERMISSION_EFFECT_KEYS)
  effect!: PermissionEffect;
}

export class SetMemberPermissionsDto {
  @ApiProperty({ type: [MemberPermissionOverrideDto] })
  @IsArray()
  @ArrayMaxSize(MEMBER_PERMISSION_OVERRIDES_MAX)
  @ValidateNested({ each: true })
  @Type(() => MemberPermissionOverrideDto)
  overrides!: MemberPermissionOverrideDto[];
}
