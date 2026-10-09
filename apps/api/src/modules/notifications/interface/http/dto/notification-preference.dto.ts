import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import type {
  NotificationChannelSettings,
  NotificationPreferenceUpdateInput,
} from '@agency-os/contracts';

export class NotificationChannelSettingsDto implements Partial<NotificationChannelSettings> {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inApp?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() push?: boolean;
}

/** `enabled` toggles the in-app channel; `channels` sets any channel individually. */
export class UpdateNotificationPreferenceDto implements NotificationPreferenceUpdateInput {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;

  @ApiPropertyOptional({ type: NotificationChannelSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationChannelSettingsDto)
  channels?: NotificationChannelSettingsDto;
}
