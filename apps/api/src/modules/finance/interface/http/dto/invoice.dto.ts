import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  INVOICE_LINE_DESCRIPTION_MAX_LENGTH,
  INVOICE_LINE_QUANTITY_MAX,
  INVOICE_NUMBER_MAX_LENGTH,
  INVOICE_TAX_RATE_MAX,
  InvoiceCreatableStatuses,
  InvoiceStatuses,
  type InvoiceCreatableStatus,
  type InvoiceCreateInput,
  type InvoiceLineInput,
  type InvoiceStatus,
  type InvoiceUpdateInput,
} from '@agency-os/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class InvoiceLineDto implements InvoiceLineInput {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(INVOICE_LINE_DESCRIPTION_MAX_LENGTH)
  description!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(INVOICE_LINE_QUANTITY_MAX)
  quantity!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Unit price in minor currency units',
  })
  @IsInt()
  @Min(0)
  unitMinor!: number;
}

export class CreateInvoiceDto implements InvoiceCreateInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientId!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(INVOICE_NUMBER_MAX_LENGTH)
  number!: string;

  @ApiProperty({ required: false, enum: InvoiceCreatableStatuses })
  @IsOptional()
  @IsIn(InvoiceCreatableStatuses)
  status?: InvoiceCreatableStatus;

  @ApiProperty({ format: 'date' })
  @IsISO8601()
  dueDate!: string;

  @ApiProperty({ minimum: 0, maximum: INVOICE_TAX_RATE_MAX })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(INVOICE_TAX_RATE_MAX)
  taxRate!: number;

  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}

export class UpdateInvoiceDto implements InvoiceUpdateInput {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ required: false, format: 'date' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiProperty({ required: false, minimum: 0, maximum: INVOICE_TAX_RATE_MAX })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(INVOICE_TAX_RATE_MAX)
  taxRate?: number;

  @ApiProperty({ required: false, type: [InvoiceLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];

  @ApiProperty({ required: false, enum: InvoiceStatuses })
  @IsOptional()
  @IsIn(InvoiceStatuses)
  status?: InvoiceStatus;
}
