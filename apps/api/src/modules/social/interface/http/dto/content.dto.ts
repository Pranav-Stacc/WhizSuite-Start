import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateContentDto {
  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ example: 'STATIC_POST' })
  @IsString()
  contentType!: string;
}
