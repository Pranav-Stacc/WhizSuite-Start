import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DomainEventTypes } from '@agency-os/contracts';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { IntegrationsRepository } from '../../integrations/infrastructure/repositories/integrations.repository';
import { MetaClient } from '../../integrations/providers/meta.client';
import { MediaService } from '../../media/application/services/media.service';
import { SocialRepository } from '../infrastructure/repositories/social.repository';

const PUBLISH_FETCH_TTL_SECONDS = 3600;

@Injectable()
export class PublishWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublishWorkerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly socialRepository: SocialRepository,
    private readonly integrations: IntegrationsRepository,
    private readonly meta: MetaClient,
    private readonly media: MediaService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.processDueJobs(), 15_000);
    this.logger.log('Publish worker started (live Meta publish enabled)');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processDueJobs(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.socialRepository.listDuePublishJobs(10);
      for (const row of due) {
        await this.processJob(row.id);
      }
    } finally {
      this.running = false;
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.socialRepository.findPublishJobForWorker(jobId);
    if (!job || job.status !== 'QUEUED') return;

    await this.prisma.publishJob.update({
      where: { id: job.id },
      data: { status: 'PUBLISHING', attempts: { increment: 1 } },
    });

    try {
      const variant = job.variant;
      const account = variant.channel.account;
      const content = variant.contentItem;
      const platform = account.platform.toLowerCase();

      if (account.publishingPaused) {
        throw new Error('Publishing is paused for this social account');
      }
      if (!account.connectionId) {
        throw new Error('Social account has no Meta connection');
      }

      if (platform !== 'instagram') {
        // Facebook Page auto-publish can be added next; mark notify-style for now.
        throw new Error(
          `Live auto-publish is only enabled for Instagram (got ${platform})`,
        );
      }

      const credential = await this.integrations.findMetaPublishCredential(
        account.connectionId,
      );
      if (!credential?.pageAccessToken) {
        throw new Error('Meta page access token missing — reconnect Instagram');
      }

      const igUserId =
        credential.instagramBusinessAccountId ??
        account.externalAccountId ??
        variant.channel.externalId;
      if (!igUserId) {
        throw new Error('Instagram business account id missing — reconnect');
      }

      const mediaIds = content.media.map((m) => m.mediaAssetId);
      const mediaFiles = await this.media.createPublishFetchUrls(
        job.organizationId,
        mediaIds,
        PUBLISH_FETCH_TTL_SECONDS,
      );
      if (mediaFiles.length === 0) {
        throw new Error(
          'No READY media on this post — upload an image or video first',
        );
      }

      const caption = buildCaption(
        variant.caption ?? content.caption,
        content.hashtags ?? [],
      );
      const contentType = (
        variant.format ??
        content.contentType ??
        'STATIC_POST'
      ).toUpperCase();

      if (contentType === 'STORY') {
        throw new Error(
          'Instagram Stories auto-publish is not supported yet — use Feed image/carousel or Reel',
        );
      }

      const videos = mediaFiles.filter((m) => m.mimeType.startsWith('video/'));
      const images = mediaFiles.filter((m) => m.mimeType.startsWith('image/'));

      let result: { platformPostId: string; permalink: string | null };

      if (
        contentType === 'REEL' ||
        contentType === 'VIDEO' ||
        (videos.length > 0 && images.length === 0)
      ) {
        const video = videos[0];
        if (!video) {
          throw new Error('Reel/Video publish requires a video file');
        }
        result = await this.meta.publishInstagramReel({
          igUserId,
          pageAccessToken: credential.pageAccessToken,
          caption,
          videoUrl: video.url,
        });
      } else {
        if (images.length === 0) {
          throw new Error('Feed publish requires at least one image');
        }
        result = await this.meta.publishInstagramFeed({
          igUserId,
          pageAccessToken: credential.pageAccessToken,
          caption,
          imageUrls: images.map((i) => i.url),
        });
      }

      const systemActor = {
        id: '00000000-0000-0000-0000-000000000000',
        type: 'system' as const,
      };

      await this.prisma.$transaction(async (tx) => {
        await tx.contentVariant.update({
          where: { id: variant.id },
          data: {
            publishStatus: 'PUBLISHED',
            platformPostId: result.platformPostId,
            permalink: result.permalink,
          },
        });

        await tx.publishJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            lastError: null,
          },
        });

        await tx.publishAttempt.create({
          data: {
            organizationId: job.organizationId,
            jobId: job.id,
            status: 'COMPLETED',
          },
        });

        if (content.status === 'SCHEDULED' || content.status === 'APPROVED') {
          await tx.contentItem.update({
            where: { id: content.id },
            data: { status: 'PUBLISHED' },
          });
          await tx.entityStateHistory.create({
            data: {
              organizationId: job.organizationId,
              entityType: 'CONTENT',
              entityId: content.id,
              fromState: content.status,
              toState: 'PUBLISHED',
              actorId: systemActor.id,
            },
          });
        }
      });

      await this.outbox.write({
        type: DomainEventTypes.SOCIAL_POST_PUBLISHED,
        version: 1,
        organizationId: job.organizationId,
        payload: {
          contentId: content.id,
          title: content.title,
          createdById: content.createdById,
          variantId: variant.id,
          jobId: job.id,
          platformPostId: result.platformPostId,
          permalink: result.permalink,
          platform: 'instagram',
        },
        actor: systemActor,
      });

      if (content.status === 'SCHEDULED' || content.status === 'APPROVED') {
        await this.outbox.write({
          type: DomainEventTypes.CONTENT_STATE_CHANGED,
          version: 1,
          organizationId: job.organizationId,
          payload: {
            contentId: content.id,
            title: content.title,
            createdById: content.createdById,
            fromStatus: content.status,
            toStatus: 'PUBLISHED',
          },
          actor: systemActor,
        });
      }

      this.logger.log(
        `Published Instagram post variant=${variant.id} media=${result.platformPostId}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Publish job ${job.id} failed: ${message}`);
      await this.prisma.publishJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', lastError: message.slice(0, 1000) },
      });
      await this.prisma.contentVariant.update({
        where: { id: job.variantId },
        data: { publishStatus: 'FAILED' },
      });
      await this.prisma.publishAttempt.create({
        data: {
          organizationId: job.organizationId,
          jobId: job.id,
          status: 'FAILED',
          errorMessage: message.slice(0, 1000),
        },
      });
      const content = job.variant?.contentItem;
      await this.outbox.write({
        type: DomainEventTypes.SOCIAL_POST_FAILED,
        version: 1,
        organizationId: job.organizationId,
        payload: {
          contentId: content?.id,
          title: content?.title,
          createdById: content?.createdById,
          variantId: job.variantId,
          jobId: job.id,
          error: message.slice(0, 500),
        },
        actor: { id: '00000000-0000-0000-0000-000000000000', type: 'system' },
      });
    }
  }
}

function buildCaption(
  caption: string | null | undefined,
  hashtags: string[],
): string {
  const base = (caption ?? '').trim();
  const tags = hashtags
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h}`));
  if (tags.length === 0) return base;
  if (!base) return tags.join(' ');
  return `${base}\n\n${tags.join(' ')}`;
}
