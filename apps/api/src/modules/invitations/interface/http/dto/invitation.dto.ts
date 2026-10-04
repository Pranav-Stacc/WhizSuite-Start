import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'EMPLOYEE' })
  @IsString()
  membershipType!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds!: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  expiresInHours?: number;
}
