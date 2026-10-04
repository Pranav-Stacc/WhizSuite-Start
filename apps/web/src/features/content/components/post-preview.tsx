import { Heart, ImageIcon, MessageCircle, Send } from 'lucide-react';
import type { ContentType, Platform } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { PLATFORM_META, PlatformBadge } from '@/shared/ui/platform';
import { LogoTile } from '@/shared/ui/avatar';

interface PostPreviewProps {
  clientName: string;
  clientColor: string;
  platform: Platform;
  contentType: ContentType;
  caption: string;
  title: string;
}

/** Approximate social-post preview so reviewers see what will actually publish. */
export function PostPreview({ clientName, clientColor, platform, contentType, caption, title }: PostPreviewProps) {
  const meta = PLATFORM_META[platform];
  const truncated = caption.length > meta.limit;
  return (
    <figure className="overflow-hidden rounded-2xl border border-border-soft bg-surface-2">
      <figcaption className="flex items-center gap-3 px-4 py-3">
        <LogoTile name={clientName} color={clientColor} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{clientName}</p>
          <p className="text-xs text-muted">{t(`type.content.${contentType}`)}</p>
        </div>
        <PlatformBadge platform={platform} />
      </figcaption>
      <div
        className="relative grid aspect-square place-items-center"
        style={{ background: `linear-gradient(135deg, ${clientColor}, color-mix(in oklab, ${clientColor} 40%, #040a09))` }}
      >
        <ImageIcon className="size-10 text-white/40" aria-hidden />
        <p className="absolute inset-x-4 bottom-4 line-clamp-2 text-balance text-center text-lg font-semibold text-white drop-shadow">{title || t('content.preview.untitled')}</p>
      </div>
      <div className="space-y-2 px-4 py-3">
        <div className="flex gap-3 text-muted" aria-hidden>
          <Heart className="size-5" />
          <MessageCircle className="size-5" />
          <Send className="size-5" />
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{caption.slice(0, meta.limit) || <span className="text-muted">{t('content.preview.empty')}</span>}</p>
        {truncated ? <p className="text-xs text-warning">{t('content.preview.truncated', { platform: meta.label, limit: meta.limit })}</p> : null}
      </div>
    </figure>
  );
}
