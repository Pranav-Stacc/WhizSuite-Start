import { ApiProperty } from '@nestjs/swagger';
import {
  AutomationActions,
  AutomationTriggers,
  type AutomationAction,
  type AutomationTrigger,
} from '@agency-os/contracts';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const NAME_MIN = 2;
const NAME_MAX = 200;
const DETAIL_MAX = 500;

export class CreateAutomationDto {
  @ApiProperty()
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  name!: string;

  @ApiProperty({ enum: AutomationTriggers })
  @IsIn(AutomationTriggers)
  trigger!: AutomationTrigger;

  @ApiProperty({ enum: AutomationActions })
  @IsIn(AutomationActions)
  action!: AutomationAction;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAutomationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  name?: string;

  @ApiProperty({ required: false, enum: AutomationTriggers })
  @IsOptional()
  @IsIn(AutomationTriggers)
  trigger?: AutomationTrigger;

  @ApiProperty({ required: false, enum: AutomationActions })
  @IsOptional()
  @IsIn(AutomationActions)
  action?: AutomationAction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** Omitted fields keep the automation's current trigger/action. */
export class PublishAutomationDto {
  @ApiProperty({ required: false, enum: AutomationTriggers })
  @IsOptional()
  @IsIn(AutomationTriggers)
  trigger?: AutomationTrigger;

  @ApiProperty({ required: false, enum: AutomationActions })
  @IsOptional()
  @IsIn(AutomationActions)
  action?: AutomationAction;
}

export class RunAutomationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(DETAIL_MAX)
  detail?: string;
}
