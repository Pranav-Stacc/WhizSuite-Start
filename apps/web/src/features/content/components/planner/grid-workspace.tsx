'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Platform } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { PlatformBadge, PLATFORM_META } from '@/shared/ui/platform';
import { PhoneGrid, type GridTile } from './phone-grid';

export interface GridPlatformChannel {
  id: string;
  platform: Platform;
  handle: string;
  followers: number;
}

export interface GridWorkspaceTile extends GridTile {
  platforms: Platform[];
}

interface GridWorkspaceProps {
  clientId: string;
  clientName: string;
  clientInitials: string;
  tiles: GridWorkspaceTile[];
  channels: GridPlatformChannel[];
  integrationsHref: string;
  /** Right-hand planner column (upload, tray, legend). */
  aside: ReactNode;
}

type Layout = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x';

function layoutFor(platform: Platform | 'all'): Layout {
  if (platform === 'facebook' || platform === 'linkedin') return platform;
  if (platform === 'tiktok' || platform === 'youtube' || platform === 'x') return platform;
  return 'instagram';
}

/** Platform picker + phone preview filtered to that channel, with the planner aside. */
export function GridWorkspace({
  clientId,
  clientName,
  clientInitials,
  tiles,
  channels,
  integrationsHref,
  aside,
}: GridWorkspaceProps) {
  const [platform, setPlatform] = useState<Platform | 'all'>(
    () => channels[0]?.platform ?? 'all',
  );

  const filtered = useMemo(() => {
    if (platform === 'all') return tiles;
    return tiles.filter((tile) => tile.platforms.includes(platform));
  }, [platform, tiles]);

  const layout = layoutFor(platform);
  const channel = channels.find((c) => c.platform === platform);

  return (
    <div className="space-y-6">
      <section aria-labelledby="grid-platforms">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 id="grid-platforms" className="eyebrow">
            {t('clients.grid.platforms')}
          </h3>
          <Link href={integrationsHref} className="nav-link text-[11px]">
            {t('clients.channels.manage')}
          </Link>
        </div>
        {channels.length === 0 ? (
          <p className="text-[13px] text-muted">{t('clients.grid.platforms.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('clients.grid.platforms')}>
            <button
              type="button"
              role="tab"
              aria-selected={platform === 'all'}
              onClick={() => setPlatform('all')}
              className={cn(
                'rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors',
                platform === 'all'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted hover:text-foreground',
              )}
            >
              {t('clients.grid.platforms.all')}
            </button>
            {channels.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={platform === item.platform}
                onClick={() => setPlatform(item.platform)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors',
                  platform === item.platform
                    ? 'border-foreground bg-surface-2 text-foreground'
                    : 'border-border text-muted hover:text-foreground',
                )}
              >
                <PlatformBadge platform={item.platform} size="xs" />
                <span>{PLATFORM_META[item.platform].label}</span>
                <span className="text-muted">{item.handle}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)] xl:gap-12">
        <PhoneGrid
          clientId={clientId}
          clientName={clientName}
          clientInitials={clientInitials}
          tiles={filtered}
          layout={layout}
          handle={channel?.handle}
          subtitle={
            channel
              ? t('clients.followers', { count: formatNumber(channel.followers, true) })
              : t('clients.grid.platforms.allHint', { count: filtered.length })
          }
        />
        <div className="space-y-8">{aside}</div>
      </div>
    </div>
  );
}
