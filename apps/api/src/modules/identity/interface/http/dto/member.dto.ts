import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  ASSIGNABLE_SCOPE_TYPE_KEYS,
  MEMBER_ROLES_MAX,
  ROLE_SCOPES_MAX,
  type AssignableScopeType,
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
