'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clapperboard, Copy, Heart, MessageCircle, Send } from 'lucide-react';
import type { ContentType, Platform } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { PlayableMedia } from '@/shared/ui/playable-media';
import { PLATFORM_META, PlatformBadge } from '@/shared/ui/platform';
import { LogoTile } from '@/shared/ui/avatar';

interface ContentMediaPreviewProps {
  clientName: string;
  clientColor: string;
  platform: Platform;
  contentType: ContentType;
  caption: string;
  hashtags: string[];
  title: string;
  media: { url?: string; mimeType: string; name: string }[];
}

function previewAspect(contentType: ContentType, platform: Platform): string {
  if (contentType === 'REEL' || platform === 'tiktok') return 'aspect-[9/16]';
  if (contentType === 'VIDEO') return 'aspect-[9/16] max-h-[min(72vh,720px)]';
  return 'aspect-[4/5]';
}

function isReelLayout(contentType: ContentType, platform: Platform): boolean {
  return contentType === 'REEL' || contentType === 'VIDEO' || platform === 'tiktok';
}

/** Social preview with reel layout, carousel navigation, and in-place video playback. */
export function ContentMediaPreview({
  clientName,
  clientColor,
  platform,
  contentType,
  caption,
  hashtags,
  title,
  media,
}: ContentMediaPreviewProps) {
  const meta = PLATFORM_META[platform];
  const fullCaption = [caption, hashtags.join(' ')].filter(Boolean).join('\n\n');
  const truncated = fullCaption.length > meta.limit;
  const reel = isReelLayout(contentType, platform);
  const [index, setIndex] = useState(0);
  const slide = media[index] ?? media[0];
  const aspect = previewAspect(contentType, platform);

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(media.length - 1, i + 1));

  return (
    <figure className={cn('overflow-hidden border border-border bg-surface', reel && 'mx-auto max-w-sm')}>
      <figcaption className="flex items-center gap-3 px-4 py-3">
        <LogoTile name={clientName} color={clientColor} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{clientName}</p>
          <p className="eyebrow inline-flex items-center gap-1">
            {reel ? <Clapperboard className="size-3" aria-hidden /> : null}
            {t(`type.content.${contentType}`)}
          </p>
        </div>
        <PlatformBadge platform={platform} />
      </figcaption>

      <div className={cn('relative border-y border-border-soft bg-black', aspect)}>
        {slide ? (
          <PlayableMedia url={slide.url} mimeType={slide.mimeType} alt={slide.name || title} controls />
        ) : (
          <div className="grid size-full place-items-center text-muted">{t('content.preview.untitled')}</div>
        )}
        {media.length > 1 ? (
          <>
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 bg-surface/90 px-1.5 py-0.5 text-[10px] tabular-nums">
              <Copy className="size-3" aria-hidden />
              {index + 1}/{media.length}
            </span>
            {index > 0 ? (
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 p-1.5 shadow"
                aria-label={t('content.preview.prevSlide')}
              >
                <ChevronLeft className="size-4" />
              </button>
            ) : null}
            {index < media.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 p-1.5 shadow"
                aria-label={t('content.preview.nextSlide')}
              >
                <ChevronRight className="size-4" />
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {!reel ? (
        <div className="space-y-2 px-4 py-3">
          <div className="flex gap-3 text-foreground" aria-hidden>
            <Heart className="size-4" />
            <MessageCircle className="size-4" />
            <Send className="size-4" />
          </div>
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
            {fullCaption.slice(0, meta.limit) || <span className="text-muted">{t('content.preview.empty')}</span>}
          </p>
          {truncated ? (
            <p className="text-[11px] text-warning">{t('content.preview.truncated', { platform: meta.label, limit: meta.limit })}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1 px-4 py-3">
          <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px] leading-relaxed">
            {fullCaption || <span className="text-muted">{t('content.preview.empty')}</span>}
          </p>
        </div>
      )}
    </figure>
  );
}
