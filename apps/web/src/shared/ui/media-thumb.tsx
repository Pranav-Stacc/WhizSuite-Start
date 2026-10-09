import { FileText, Film, ImageIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface MediaThumbProps {
  url?: string;
  mimeType?: string;
  /** Accessible description; pass an empty string for purely decorative thumbnails. */
  alt: string;
  className?: string;
  /** Text shown on empty tiles (e.g. a post title). */
  placeholder?: string;
}

const VIDEO_PREFIX = 'video/';
const IMAGE_PREFIX = 'image/';

/** Square-cornered media tile: image when a preview URL exists, otherwise a quiet typed placeholder. */
export function MediaThumb({ url, mimeType = '', alt, className, placeholder }: MediaThumbProps) {
  if (url && mimeType.startsWith(IMAGE_PREFIX)) {
    // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs are short-lived and not optimisable
    return <img src={url} alt={alt} loading="lazy" decoding="async" className={cn('size-full object-cover', className)} />;
  }
  if (url && mimeType.startsWith(VIDEO_PREFIX)) {
    return <video src={url} muted playsInline preload="metadata" aria-label={alt || undefined} className={cn('size-full object-cover', className)} />;
  }
  const Icon = mimeType.startsWith(VIDEO_PREFIX) ? Film : mimeType.startsWith(IMAGE_PREFIX) || !mimeType ? ImageIcon : FileText;
  return (
    <div role={alt ? 'img' : undefined} aria-label={alt || undefined} className={cn('flex size-full flex-col items-center justify-center gap-2 bg-surface-2 p-3 text-center text-muted', className)}>
      <Icon className="size-4" aria-hidden />
      {placeholder ? <span className="line-clamp-3 text-[10.5px] uppercase leading-snug tracking-[0.12em]">{placeholder}</span> : null}
    </div>
  );
}
