import { ContentStatuses, Permissions } from '@agency-os/contracts';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { initials } from '@/shared/lib/format';
import { SectionHeading } from '@/shared/ui/section-heading';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionNumber } from '@/features/clients/workspace';
import { AssetTray } from '@/features/content/components/planner/asset-tray';
import { toGridTiles } from '@/features/content/components/planner/grid-tiles';
import { PhoneGrid } from '@/features/content/components/planner/phone-grid';
import { NewPostButton, PlannerDrawerProvider } from '@/features/content/components/planner/planner-drawer';
import { loadPlanner } from '@/features/content/services/planner.service';
import { UploadDropzone } from '@/features/media/components/upload-dropzone';

export const metadata = { title: t('clients.workspace.grid') };

const READY = 'READY';

export default async function ClientGridPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permissions.CONTENT_VIEW);
  const client = await getClient((await params).id);
  if (!client) notFound();
  const planner = await loadPlanner(client.id);

  const usedAssetIds = new Set(planner.posts.flatMap((p) => p.media.map((m) => m.assetId)));
  const tray = planner.assets
    .filter((a) => a.status === READY)
    .map((a) => ({ id: a.id, name: a.name, mimeType: a.mimeType, url: a.url, used: usedAssetIds.has(a.id) }));
  const statusCounts = ContentStatuses.map((status) => ({ status, count: planner.posts.filter((p) => p.status === status).length })).filter((s) => s.count > 0);

  return (
    <PlannerDrawerProvider {...planner.drawer}>
      <section>
        <SectionHeading number={clientSectionNumber('grid')} title={t('clients.workspace.grid')}>
          <NewPostButton className="nav-link">{t('grid.newPost')}</NewPostButton>
        </SectionHeading>

        <div className="grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)] xl:gap-12">
          <PhoneGrid clientId={client.id} clientName={client.name} clientInitials={initials(client.name)} tiles={toGridTiles(planner.posts)} />

          <div className="space-y-8">
            <section aria-labelledby="grid-upload">
              <h3 id="grid-upload" className="eyebrow mb-4">
                {t('grid.upload.title')}
              </h3>
              <UploadDropzone clientId={client.id} enabled={isLiveMode} />
            </section>

            <section aria-labelledby="grid-tray">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h3 id="grid-tray" className="eyebrow">
                  {t('grid.tray.title', { count: tray.length })}
                </h3>
                <p className="text-[11px] text-muted">{t('grid.tray.hint')}</p>
              </div>
              <AssetTray assets={tray} />
            </section>

            <section aria-labelledby="grid-legend" className="border-t border-border pt-6">
              <h3 id="grid-legend" className="eyebrow mb-4">
                {t('grid.legend')}
              </h3>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
                {statusCounts.map(({ status, count }) => (
                  <li key={status} className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: TONE_COLOR[statusTone('content', status)] }} aria-hidden />
                    {statusLabel('content', status)}
                    <span className="tabular-nums text-muted">{count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12px] leading-relaxed text-muted">{t('grid.keyboard')}</p>
            </section>
          </div>
        </div>
      </section>
    </PlannerDrawerProvider>
  );
}
