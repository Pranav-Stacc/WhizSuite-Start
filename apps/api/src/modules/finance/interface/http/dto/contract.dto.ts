import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CONTRACT_TITLE_MAX_LENGTH,
  ContractStatuses,
  ContractTypes,
  type ContractStatus,
  type ContractType,
  type CreateContractInput,
  type UpdateContractInput,
} from '@agency-os/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContractDto implements Omit<CreateContractInput, 'type'> {
  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(CONTRACT_TITLE_MAX_LENGTH)
  title!: string;

  @ApiPropertyOptional({ enum: ContractTypes })
  @IsOptional()
  @IsIn(ContractTypes)
  type?: ContractType = 'OTHER';

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

export class UpdateContractDto implements UpdateContractInput {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(CONTRACT_TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional({ enum: ContractTypes })
  @IsOptional()
  @IsIn(ContractTypes)
  type?: ContractType;

  @ApiPropertyOptional({ enum: ContractStatuses })
  @IsOptional()
  @IsIn(ContractStatuses)
  status?: ContractStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  startDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  endDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  signedAt?: string | null;
}

export class ListContractsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;
}
