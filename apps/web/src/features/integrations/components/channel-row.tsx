import { Link2, RefreshCw, Unplug } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { formatNumber, relativeTime } from '@/shared/lib/format';
import { isLiveMode } from '@/shared/config/env';
import { FormDialog } from '@/shared/forms/form-dialog';
import { ActionButton } from '@/shared/ui/action-button';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { PlatformBadge, PLATFORM_META } from '@/shared/ui/platform';
import {
  connectIntegrationAction,
  connectMetaAction,
  disconnectIntegrationAction,
  syncIntegrationAction,
} from '../actions/integration.actions';
import type { Integration } from '../data/integrations.repository';

function isMetaPlatform(
  platform: Integration['platform'],
): platform is 'instagram' | 'facebook' {
  return platform === 'instagram' || platform === 'facebook';
}

export function ChannelRow({
  integration,
  clientName,
}: {
  integration: Integration;
  clientName: string;
}) {
  const meta = PLATFORM_META[integration.platform];
  const useMetaOauth = isLiveMode && isMetaPlatform(integration.platform);

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <PlatformBadge platform={integration.platform} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {meta.label}
          {integration.connected ? (
            <Badge tone="success" dot>
              {t('integrations.status.connected')}
            </Badge>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted">
          {integration.connected
            ? t('integrations.row.meta', {
                handle: integration.handle,
                followers: formatNumber(integration.followers, true),
                synced: integration.lastSyncAt
                  ? relativeTime(integration.lastSyncAt)
                  : t('integrations.never'),
              })
            : t('integrations.row.available')}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {integration.connected ? (
          <>
            <ActionButton
              action={syncIntegrationAction.bind(null, integration.id)}
              label={t('integrations.sync')}
              icon={<RefreshCw />}
              size="sm"
              variant="ghost"
            />
            <ConfirmButton
              action={disconnectIntegrationAction.bind(null, integration.id)}
              label={t('integrations.disconnect')}
              icon={<Unplug />}
              size="sm"
            />
          </>
        ) : useMetaOauth && isMetaPlatform(integration.platform) ? (
          <ActionButton
            action={connectMetaAction.bind(
              null,
              integration.clientId,
              integration.platform,
            )}
            label={t('integrations.connect')}
            icon={<Link2 />}
            size="sm"
            variant="secondary"
          />
        ) : (
          <FormDialog
            key={integration.id}
            schema="integration"
            title={t('integrations.connect.title', { platform: meta.label })}
            description={t('integrations.connect.desc', { client: clientName })}
            submitLabel={t('integrations.connect')}
            fields={[
              {
                name: 'handle',
                label: t('integrations.field.handle'),
                placeholder: t('integrations.field.handle.placeholder'),
                required: true,
                hint: t('integrations.field.handle.hint'),
                span: 2,
              },
            ]}
            defaults={{ handle: '' }}
            action={connectIntegrationAction.bind(null, integration.id)}
            trigger={
              <Button variant="secondary" size="sm">
                <Link2 />
                {t('integrations.connect')}
              </Button>
            }
          />
        )}
      </div>
    </li>
  );
}
