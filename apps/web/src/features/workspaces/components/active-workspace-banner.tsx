import { t } from '@/shared/i18n/t';
import { activeWorkspaceSummary } from '@/shared/workspace/active-scope';
import { Layers } from 'lucide-react';

/** Explains what changes when the member switches tenancy workspace. */
export async function ActiveWorkspaceBanner() {
  const { active, workspaces, uiEnabled } = await activeWorkspaceSummary();
  if (!uiEnabled || !active || workspaces.length < 2) return null;

  return (
    <div
      className="mb-6 flex gap-3 rounded-lg border border-border-soft bg-surface/60 px-4 py-3 text-sm"
      role="status"
    >
      <Layers className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <div>
        <p className="font-medium text-fg">
          {t('orgWorkspace.banner.title', { name: active.name })}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{t('orgWorkspace.banner.body')}</p>
      </div>
    </div>
  );
}
