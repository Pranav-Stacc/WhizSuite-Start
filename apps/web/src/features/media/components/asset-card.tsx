import { FileText, Film, ImageIcon, Trash2 } from 'lucide-react';
import type { AssetKind } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { formatFileSize, relativeTime } from '@/shared/lib/format';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { deleteAssetAction } from '../actions/media.actions';
import type { Asset } from '../data/media.repository';

const KIND_ICON = { image: ImageIcon, video: Film, document: FileText } satisfies Record<AssetKind, typeof ImageIcon>;

export function AssetCard({ asset, clientName, canDelete }: { asset: Asset; clientName?: string; canDelete: boolean }) {
  const Icon = KIND_ICON[asset.kind];
  return (
    <article className="card-surface card-hover group overflow-hidden">
      <div
        className="relative grid aspect-[4/3] place-items-center"
        style={{ background: `linear-gradient(135deg, hsl(${asset.hue} 70% 42%), hsl(${(asset.hue + 40) % 360} 65% 18%))` }}
      >
        <Icon className="size-9 text-white/55" aria-hidden />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur">{t(`media.kind.${asset.kind}`)}</span>
      </div>
      <div className="space-y-2 p-3.5">
        <p className="truncate text-sm font-medium" title={asset.name}>
          {asset.name}
        </p>
        <p className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{clientName}</span>
          <span className="shrink-0 tabular-nums">{formatFileSize(asset.sizeKb)}</span>
        </p>
        {asset.tags.length ? (
          <ul className="flex flex-wrap gap-1">
            {asset.tags.map((tag) => (
              <li key={tag} className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-muted">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted">{relativeTime(asset.createdAt)}</span>
          {canDelete ? <ConfirmButton action={deleteAssetAction.bind(null, asset.id)} label={t('common.delete')} icon={<Trash2 />} size="sm" /> : null}
        </div>
      </div>
    </article>
  );
}
