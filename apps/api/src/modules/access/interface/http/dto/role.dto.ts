import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
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

export class PermissionScopeDto {
  @ApiProperty({ enum: ALL_PERMISSIONS })
  @IsIn(ALL_PERMISSIONS)
  key!: Permission;

  @ApiProperty({ type: [String], enum: ASSIGNABLE_SCOPE_TYPE_KEYS })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ASSIGNABLE_SCOPE_TYPE_KEYS.length)
  @IsIn(ASSIGNABLE_SCOPE_TYPE_KEYS, { each: true })
  scopeTypes!: AssignableScopeType[];
}

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

  @ApiPropertyOptional({ type: [PermissionScopeDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ALL_PERMISSIONS.length)
  @ValidateNested({ each: true })
  @Type(() => PermissionScopeDto)
  permissionScopes?: PermissionScopeDto[];
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

  @ApiPropertyOptional({ type: [PermissionScopeDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ALL_PERMISSIONS.length)
  @ValidateNested({ each: true })
  @Type(() => PermissionScopeDto)
  permissionScopes?: PermissionScopeDto[];
}
