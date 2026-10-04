import { cn } from '@/shared/lib/cn';
import { hueFor, initials } from '@/shared/lib/format';

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
} as const;

export function Avatar({ name, size = 'sm', className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  const hue = hueFor(name);
  return (
    <span
      aria-label={name}
      title={name}
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-surface', SIZES[size], className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 75% 38%))` }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 4, size = 'xs' }: { names: string[]; max?: number; size?: keyof typeof SIZES }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((name) => (
        <Avatar key={name} name={name} size={size} />
      ))}
      {rest > 0 ? (
        <span className={cn('inline-grid place-items-center rounded-full bg-surface-3 text-[10px] font-medium text-muted ring-2 ring-surface', SIZES[size])}>
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

/** Brand-colour logo tile for clients and workspaces. */
export function LogoTile({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-14 text-lg' : 'size-10 text-sm';
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-xl font-bold text-white shadow-inner', dim)}
      style={{ background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, black))` }}
    >
      {initials(name)}
    </span>
  );
}
