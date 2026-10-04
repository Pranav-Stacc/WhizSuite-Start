import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;
}
