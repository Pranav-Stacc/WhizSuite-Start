import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  DeviceDto,
  DevicePlatform,
  RegisterDeviceInput,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';

const ENTITY_TYPE = 'device';

interface DeviceRow {
  id: string;
  platform: string;
  appVersion: string | null;
  lastSeenAt: Date;
}

function toDto(row: DeviceRow): DeviceDto {
  return {
    id: row.id,
    platform: row.platform as DevicePlatform,
    appVersion: row.appVersion,
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}

/** Push-capable devices of the signed-in user; the token itself is never returned. */
@Injectable()
export class DevicesService {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string, userId: string): Promise<DeviceDto[]> {
    return (await this.repository.listDevices(organizationId, userId)).map(
      toDto,
    );
  }

  async register(
    organizationId: string,
    userId: string,
    input: RegisterDeviceInput,
  ): Promise<DeviceDto> {
    const device = await this.repository.upsertDevice({
      organizationId,
      userId,
      ...input,
    });
    await this.repository.pruneDevices(
      organizationId,
      userId,
      this.config.get('DEVICES_PER_USER_MAX', { infer: true }),
    );
    await this.audit.record({
      organizationId,
      actorId: userId,
      actorType: 'user',
      action: 'notification.device_register',
      entityType: ENTITY_TYPE,
      entityId: device.id,
      after: { platform: device.platform, appVersion: device.appVersion },
    });
    return toDto(device);
  }

  async remove(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<void> {
    if (!(await this.repository.deleteDevice(organizationId, userId, id)))
      throw notFound('Device not found');
    await this.audit.record({
      organizationId,
      actorId: userId,
      actorType: 'user',
      action: 'notification.device_remove',
      entityType: ENTITY_TYPE,
      entityId: id,
    });
  }
}
