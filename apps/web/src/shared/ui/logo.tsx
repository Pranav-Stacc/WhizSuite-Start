import Image from 'next/image';
import { t } from '@/shared/i18n/t';
import { BRAND_ASSETS, BRAND_FRAME_CLASS, PRIMARY_LOGO_ASPECT } from '@/shared/brand/assets';
import { cn } from '@/shared/lib/cn';

const PRIMARY_HEIGHT = 32;
const SYMBOL_SIZE = 28;

export function LogoMark({ className, size = SYMBOL_SIZE }: { className?: string; size?: number }) {
  return (
    <span className={cn(BRAND_FRAME_CLASS, 'shrink-0 p-1', className)}>
      <Image
        src={BRAND_ASSETS.symbolLogo}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain"
        priority
      />
    </span>
  );
}

/** Full wordmark or compact mark. `name` shows symbol + agency name instead of the product wordmark. */
export function Logo({ className, compact = false, name }: { className?: string; compact?: boolean; name?: string }) {
  if (compact) return <LogoMark className={className} />;

  if (name) {
    return (
      <span className={cn('inline-flex min-w-0 max-w-full items-center gap-2.5', className)}>
        <LogoMark />
        <span className="truncate text-sm font-semibold tracking-tight">{name}</span>
      </span>
    );
  }

  const width = Math.round(PRIMARY_HEIGHT * PRIMARY_LOGO_ASPECT);
  return (
    <span className={cn(BRAND_FRAME_CLASS, 'px-2 py-1', className)}>
      <Image
        src={BRAND_ASSETS.primaryLogo}
        alt={t('app.name')}
        width={width}
        height={PRIMARY_HEIGHT}
        className="h-8 w-auto object-contain"
        priority
      />
    </span>
  );
}
