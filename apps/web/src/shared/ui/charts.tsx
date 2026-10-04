import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export const CHART_COLORS = [
  'var(--primary)',
  'var(--color-info)',
  'var(--color-violet)',
  'var(--color-warning)',
  'var(--color-pink)',
  'var(--secondary)',
] as const;

function scale(values: number[], height: number, pad: number, min?: number, max?: number) {
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const range = hi - lo || 1;
  return (v: number) => height - pad - ((v - lo) / range) * (height - pad * 2);
}

function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return '';
  let d = `M ${points[0]![0]} ${points[0]![1]}`;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i]!;
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 33 + input.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function Sparkline({ data, color = 'var(--primary)', className }: { data: number[]; color?: string; className?: string }) {
  const w = 120;
  const h = 36;
  const y = scale(data, h, 3);
  const step = w / Math.max(1, data.length - 1);
  const points = data.map((v, i) => [i * step, y(v)] as [number, number]);
  const line = smoothPath(points);
  const id = `sp-${hashId(data.join(','))}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-9 w-full', className)} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

interface Series {
  label: string;
  data: number[];
  color?: string;
}

export function AreaChart({ series, labels, height = 240, format }: { series: Series[]; labels?: string[]; height?: number; format?: (v: number) => string }) {
  const w = 720;
  const padX = 8;
  const padTop = 14;
  const padBottom = 26;
  const all = series.flatMap((s) => s.data);
  const max = Math.max(...all, 1) * 1.1;
  const y = scale(all, height - padBottom + 14, padTop, 0, max);
  const length = series[0]?.data.length ?? 0;
  const step = (w - padX * 2) / Math.max(1, length - 1);
  const gridLines = 4;
  const id = hashId(series.map((s) => s.label + s.data.join()).join('|'));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.label).join(', ')}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.label} id={`ac-${id}-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity="0.32" />
              <stop offset="100%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const gy = padTop + (i * (height - padBottom - padTop)) / gridLines;
          const val = max - (i * max) / gridLines;
          return (
            <g key={gy}>
              <line x1={padX} x2={w - padX} y1={gy} y2={gy} stroke="var(--color-border-soft)" strokeDasharray="3 5" />
              <text x={w - padX} y={gy - 4} textAnchor="end" fontSize="10" fill="var(--muted)">
                {format ? format(val) : Math.round(val)}
              </text>
            </g>
          );
        })}
        {series.map((s, i) => {
          const color = s.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
          const pts = s.data.map((v, idx) => [padX + idx * step, y(v)] as [number, number]);
          const line = smoothPath(pts);
          return (
            <g key={s.label}>
              {i === 0 ? <path d={`${line} L ${padX + (length - 1) * step} ${height - padBottom} L ${padX} ${height - padBottom} Z`} fill={`url(#ac-${id}-${i})`} /> : null}
              <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        })}
        {labels?.map((label, i) =>
          i % Math.ceil(labels.length / 7) === 0 ? (
            <text key={label + i} x={padX + i * step} y={height - 6} fontSize="10" fill="var(--muted)" textAnchor="middle">
              {label}
            </text>
          ) : null,
        )}
      </svg>
      {series.length > 1 ? (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          {series.map((s, i) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BarChart({ data, height = 180, format }: { data: Array<{ label: string; value: number; color?: string }>; height?: number; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex w-full items-end gap-2.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">{format ? format(d.value) : d.value}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500 group-hover:brightness-125"
            style={{ height: `${Math.max(4, (d.value / max) * 100)}%`, background: d.color ?? CHART_COLORS[i % CHART_COLORS.length], opacity: 0.9 }}
          />
          <span className="w-full truncate text-center text-[11px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, size = 148, centerValue, centerLabel }: { segments: Array<{ label: string; value: number; color?: string }>; size?: number; centerValue?: ReactNode; centerLabel?: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const node = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(0, len - 3)} ${c}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += len;
            return node;
          })}
        </svg>
        <span className="absolute text-center">
          <span className="block text-xl font-semibold leading-none">{centerValue}</span>
          {centerLabel ? <span className="mt-1 block text-[11px] text-muted">{centerLabel}</span> : null}
        </span>
      </span>
      <ul className="space-y-1.5 text-sm">
        {segments.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBarList({ rows, format }: { rows: Array<{ label: string; value: number; sub?: string; color?: string }>; format?: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row, i) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{format ? format(row.value) : row.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(row.value / max) * 100}%`, background: row.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
          </div>
          {row.sub ? <p className="mt-1 text-xs text-muted">{row.sub}</p> : null}
        </li>
      ))}
    </ul>
  );
}
