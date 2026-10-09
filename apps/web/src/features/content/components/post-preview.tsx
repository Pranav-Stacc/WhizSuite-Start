import { Copy, Heart, MessageCircle, Send } from 'lucide-react';
import type { ContentType, Platform } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { MediaThumb } from '@/shared/ui/media-thumb';
import { PLATFORM_META, PlatformBadge } from '@/shared/ui/platform';
import { LogoTile } from '@/shared/ui/avatar';

interface PostPreviewProps {
  clientName: string;
  clientColor: string;
  platform: Platform;
  contentType: ContentType;
  caption: string;
  hashtags: string[];
  title: string;
  media: { url?: string; mimeType: string; name: string }[];
}

/** Approximate social-post preview so reviewers see what will actually publish. */
export function PostPreview({ clientName, clientColor, platform, contentType, caption, hashtags, title, media }: PostPreviewProps) {
  const meta = PLATFORM_META[platform];
  const fullCaption = [caption, hashtags.join(' ')].filter(Boolean).join('\n\n');
  const truncated = fullCaption.length > meta.limit;
  const [cover] = media;
  return (
    <figure className="overflow-hidden border border-border bg-surface">
      <figcaption className="flex items-center gap-3 px-4 py-3">
        <LogoTile name={clientName} color={clientColor} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{clientName}</p>
          <p className="eyebrow">{t(`type.content.${contentType}`)}</p>
        </div>
        <PlatformBadge platform={platform} />
      </figcaption>
      <div className="relative aspect-[4/5] border-y border-border-soft">
        <MediaThumb url={cover?.url} mimeType={cover?.mimeType} alt={cover?.name ?? ''} placeholder={title || t('content.preview.untitled')} />
        {media.length > 1 ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 bg-surface/90 px-1.5 py-0.5 text-[10px] tabular-nums">
            <Copy className="size-3" aria-hidden />
            {t('content.preview.slides', { count: media.length })}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 px-4 py-3">
        <div className="flex gap-3 text-foreground" aria-hidden>
          <Heart className="size-4" />
          <MessageCircle className="size-4" />
          <Send className="size-4" />
        </div>
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{fullCaption.slice(0, meta.limit) || <span className="text-muted">{t('content.preview.empty')}</span>}</p>
        {truncated ? <p className="text-[11px] text-warning">{t('content.preview.truncated', { platform: meta.label, limit: meta.limit })}</p> : null}
      </div>
    </figure>
  );
}
