import type { Platform } from '@agency-os/contracts';
import { cn } from '@/shared/lib/cn';

export const PLATFORM_META: Record<Platform, { label: string; color: string; glyph: string; limit: number }> = {
  instagram: { label: 'Instagram', color: 'linear-gradient(135deg,#f9ce34,#ee2a7b 55%,#6228d7)', glyph: 'IG', limit: 2200 },
  facebook: { label: 'Facebook', color: '#1877f2', glyph: 'f', limit: 63206 },
  linkedin: { label: 'LinkedIn', color: '#0a66c2', glyph: 'in', limit: 3000 },
  x: { label: 'X', color: '#15181b', glyph: 'X', limit: 280 },
  youtube: { label: 'YouTube', color: '#ff0033', glyph: 'YT', limit: 5000 },
  tiktok: { label: 'TikTok', color: 'linear-gradient(135deg,#25f4ee,#111 50%,#fe2c55)', glyph: 'TT', limit: 2200 },
};

export function PlatformBadge({ platform, size = 'sm', className }: { platform: Platform; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const meta = PLATFORM_META[platform];
  const dim = size === 'xs' ? 'size-5 text-[8px]' : size === 'md' ? 'size-9 text-xs' : 'size-6 text-[9px]';
  return (
    <span
      title={meta.label}
      aria-label={meta.label}
      className={cn('inline-grid shrink-0 place-items-center rounded-md font-bold text-white ring-1 ring-white/10', dim, className)}
      style={{ background: meta.color }}
    >
      {meta.glyph}
    </span>
  );
}

export function PlatformStack({ platforms, size = 'sm' }: { platforms: Platform[]; size?: 'xs' | 'sm' | 'md' }) {
  return (
    <span className="inline-flex -space-x-1.5">
      {platforms.map((p) => (
        <PlatformBadge key={p} platform={p} size={size} className="ring-2 ring-surface" />
      ))}
    </span>
  );
}
