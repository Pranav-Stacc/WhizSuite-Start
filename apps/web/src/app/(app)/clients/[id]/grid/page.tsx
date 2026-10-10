import { ContentStatuses, Permissions } from '@agency-os/contracts';
import { notFound } from 'next/navigation';
import { getPermissions, requirePermission } from '@/shared/auth/permissions';
import { isLiveMode } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { initials } from '@/shared/lib/format';
import { SectionHeading } from '@/shared/ui/section-heading';
import { statusLabel, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { getClient } from '@/features/clients/services/clients.service';
import { clientSectionHref, clientSectionNumber } from '@/features/clients/workspace';
import { AssetTray } from '@/features/content/components/planner/asset-tray';
import { toGridTiles } from '@/features/content/components/planner/grid-tiles';
import { GridWorkspace } from '@/features/content/components/planner/grid-workspace';
import { NewPostButton, PlannerDrawerProvider } from '@/features/content/components/planner/planner-drawer';
import { loadPlanner } from '@/features/content/services/planner.service';
import { listIntegrations } from '@/features/integrations/services/integrations.service';
import { UploadDropzone } from '@/features/media/components/upload-dropzone';

export const metadata = { title: t('clients.workspace.grid') };

const READY = 'READY';

export default async function ClientGridPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permissions.CONTENT_VIEW);
  const client = await getClient((await params).id);
  if (!client) notFound();
  const granted = await getPermissions();
  const [planner, integrations] = await Promise.all([
    loadPlanner(client.id),
    granted.has(Permissions.INTEGRATIONS_MANAGE) || granted.has(Permissions.CLIENTS_VIEW)
      ? listIntegrations()
      : Promise.resolve([]),
  ]);

  const usedAssetIds = new Set(planner.posts.flatMap((p) => p.media.map((m) => m.assetId)));
  const tray = planner.assets
    .filter((a) => a.status === READY)
    .map((a) => ({ id: a.id, name: a.name, mimeType: a.mimeType, url: a.url, used: usedAssetIds.has(a.id) }));
  const statusCounts = ContentStatuses.map((status) => ({
    status,
    count: planner.posts.filter((p) => p.status === status).length,
  })).filter((s) => s.count > 0);
  const channels = integrations
    .filter((i) => i.clientId === client.id && i.connected)
    .map((i) => ({
      id: i.id,
      platform: i.platform,
      handle: i.handle,
      followers: i.followers,
    }));

  return (
    <PlannerDrawerProvider {...planner.drawer} uploadEnabled={isLiveMode}>
      <section>
        <SectionHeading number={clientSectionNumber('grid')} title={t('clients.workspace.grid')}>
          <NewPostButton className="nav-link">{t('grid.newPost')}</NewPostButton>
        </SectionHeading>

        <GridWorkspace
          clientId={client.id}
          clientName={client.name}
          clientInitials={initials(client.name)}
          tiles={toGridTiles(planner.posts)}
          channels={channels}
          integrationsHref={clientSectionHref(client.id, 'integrations')}
          aside={
            <>
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
            </>
          }
        />
      </section>
    </PlannerDrawerProvider>
  );
}
