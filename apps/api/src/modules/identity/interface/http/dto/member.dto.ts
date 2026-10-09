import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  STAFF_MEMBERSHIP_TYPES,
  type StaffMembershipType,
} from '../../../../access/config/default-roles';

export class UpdateMemberDto {
  @ApiProperty({ enum: STAFF_MEMBERSHIP_TYPES })
  @IsIn(STAFF_MEMBERSHIP_TYPES)
  membershipType!: StaffMembershipType;
}
