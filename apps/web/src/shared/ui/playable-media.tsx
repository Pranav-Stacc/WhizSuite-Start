'use client';

import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface PlayableMediaProps {
  url?: string;
  mimeType?: string;
  alt: string;
  className?: string;
  /** Show native controls when playing (recommended for detail views). */
  controls?: boolean;
}

const VIDEO_PREFIX = 'video/';
const IMAGE_PREFIX = 'image/';

/** Image or video tile with an explicit play affordance for video assets. */
export function PlayableMedia({ url, mimeType = '', alt, className, controls = true }: PlayableMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  if (url && mimeType.startsWith(IMAGE_PREFIX)) {
    // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs are short-lived
    return <img src={url} alt={alt} loading="lazy" decoding="async" className={cn('size-full object-cover', className)} />;
  }

  if (url && mimeType.startsWith(VIDEO_PREFIX)) {
    const toggle = async () => {
      const el = videoRef.current;
      if (!el) return;
      if (el.paused) {
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
    };

    return (
      <div className={cn('group relative size-full bg-black', className)}>
        <video
          ref={videoRef}
          src={url}
          playsInline
          preload="metadata"
          controls={playing && controls}
          aria-label={alt}
          className="size-full object-contain"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
        {!playing ? (
          <button
            type="button"
            onClick={() => void toggle()}
            className="absolute inset-0 grid place-items-center bg-black/25 transition-colors hover:bg-black/35"
            aria-label={alt}
          >
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-lg">
              <Play className="size-6 fill-current" aria-hidden />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void toggle()}
            className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-full bg-surface/90 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
            aria-label="Pause"
          >
            <Pause className="size-4" aria-hidden />
          </button>
        )}
      </div>
    );
  }

  return null;
}
