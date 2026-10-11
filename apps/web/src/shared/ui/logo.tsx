import Image from 'next/image';
import { BRAND_ASSETS, BRAND_FRAME_CLASS } from '@/shared/brand/assets';
import { cn } from '@/shared/lib/cn';

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

/** Product mark (icon only). `name` shows symbol + label text (never the wordmark image). */
export function Logo({ className, compact = false, name }: { className?: string; compact?: boolean; name?: string }) {
  if (compact || !name) return <LogoMark className={className} />;

  return (
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-2.5', className)}>
      <LogoMark />
      <span className="truncate text-sm font-semibold tracking-tight">{name}</span>
    </span>
  );
}
