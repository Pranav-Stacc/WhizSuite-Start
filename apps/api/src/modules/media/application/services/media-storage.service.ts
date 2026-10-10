import { Injectable } from '@nestjs/common';
import {
  STORAGE_BYTES_ENTITLEMENT,
  type MediaStorageUsageDto,
} from '@agency-os/contracts';
import { BillingService } from '../../../billing/application/services/billing.service';
import { MediaRepository } from '../../infrastructure/repositories/media.repository';

@Injectable()
export class MediaStorageService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly billing: BillingService,
  ) {}

  async usage(organizationId: string): Promise<MediaStorageUsageDto> {
    const [{ usedBytes, assetCount }, limitBytes] = await Promise.all([
      this.repository.sumReadyStorage(organizationId),
      this.billing.limitMax(organizationId, STORAGE_BYTES_ENTITLEMENT),
    ]);
    const ratio =
      limitBytes && limitBytes > 0 ? Math.min(1, usedBytes / limitBytes) : 0;
    return { usedBytes, limitBytes, assetCount, ratio };
  }

  /** Returns false when the org would exceed its plan storage cap after `additionalBytes`. */
  async canAccept(
    organizationId: string,
    additionalBytes: number,
  ): Promise<boolean> {
    const { usedBytes } = await this.repository.sumReadyStorage(organizationId);
    return this.billing.checkLimit(
      organizationId,
      STORAGE_BYTES_ENTITLEMENT,
      usedBytes + additionalBytes,
    );
  }
}
