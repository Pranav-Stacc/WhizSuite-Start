import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsUUID } from 'class-validator';
import {
  IntegrationConnectionStatuses,
  type IntegrationConnectionStatus,
} from '@agency-os/contracts';

export class CreateConnectionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  providerId!: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateConnectionDto {
  @ApiProperty({ required: false, enum: IntegrationConnectionStatuses })
  @IsOptional()
  @IsIn(IntegrationConnectionStatuses)
  status?: IntegrationConnectionStatus;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
