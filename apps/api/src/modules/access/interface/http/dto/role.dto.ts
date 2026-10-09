import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ALL_PERMISSIONS,
  ASSIGNABLE_SCOPE_TYPE_KEYS,
  AssignableScopeTypes,
  ROLE_DESCRIPTION_MAX_LENGTH,
  ROLE_KIND_KEYS,
  ROLE_NAME_MAX_LENGTH,
  ROLE_SCOPES_MAX,
  RoleKinds,
  type AssignableScopeType,
  type Permission,
  type RoleKind,
} from '@agency-os/contracts';

const ROLE_NAME_MIN_LENGTH = 2;

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(ROLE_NAME_MIN_LENGTH)
  @MaxLength(ROLE_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(ROLE_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiProperty({ enum: ROLE_KIND_KEYS, default: RoleKinds.ACCESS })
  @IsOptional()
  @IsIn(ROLE_KIND_KEYS)
  kind: RoleKind = RoleKinds.ACCESS;

  @ApiProperty({
    type: [String],
    enum: ALL_PERMISSIONS,
    required: false,
    description: 'Required for ACCESS roles; optional for WORKFLOW roles.',
  })
  @IsOptional()
  @IsArray()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissionKeys: Permission[] = [];

  @ApiProperty({
    type: [String],
    enum: ASSIGNABLE_SCOPE_TYPE_KEYS,
    default: [AssignableScopeTypes.ORGANIZATION],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROLE_SCOPES_MAX)
  @IsIn(ASSIGNABLE_SCOPE_TYPE_KEYS, { each: true })
  defaultScopeTypes: AssignableScopeType[] = [
    AssignableScopeTypes.ORGANIZATION,
  ];
}

export class UpdateRoleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(ROLE_NAME_MIN_LENGTH)
  @MaxLength(ROLE_NAME_MAX_LENGTH)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(ROLE_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiProperty({ enum: ROLE_KIND_KEYS, required: false })
  @IsOptional()
  @IsIn(ROLE_KIND_KEYS)
  kind?: RoleKind;

  @ApiProperty({
    required: false,
    type: [String],
    enum: ALL_PERMISSIONS,
  })
  @IsOptional()
  @IsArray()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissionKeys?: Permission[];

  @ApiProperty({
    required: false,
    type: [String],
    enum: ASSIGNABLE_SCOPE_TYPE_KEYS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROLE_SCOPES_MAX)
  @IsIn(ASSIGNABLE_SCOPE_TYPE_KEYS, { each: true })
  defaultScopeTypes?: AssignableScopeType[];
}
