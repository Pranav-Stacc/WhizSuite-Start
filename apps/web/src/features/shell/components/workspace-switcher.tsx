'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Landmark, Users } from 'lucide-react';
import { publicEnv } from '@/shared/config/public-env';
import { t } from '@/shared/i18n/t';
import { workspaceHref } from '@/shared/workspace/host';
import {
  WORKSPACE_MODULE_COOKIE,
  homePathForModule,
  type WorkspaceModule,
} from '@/shared/workspace/modules';
import { Menu } from '@/shared/ui/overlays';
import { prepareWorkspaceHopAction, switchWorkspaceModuleAction } from '../actions/workspace.actions';

const MODULES: Array<{ id: WorkspaceModule; icon: typeof Building2; labelKey: 'workspace.main' | 'workspace.crm' | 'workspace.finance' }> = [
  { id: 'main', icon: Building2, labelKey: 'workspace.main' },
  { id: 'crm', icon: Users, labelKey: 'workspace.crm' },
  { id: 'finance', icon: Landmark, labelKey: 'workspace.finance' },
];

interface WorkspaceSwitcherProps {
  module: WorkspaceModule;
  orgSlug?: string;
  /** Permissions gate — hide CRM/Finance entries the member cannot open. */
  canCrm: boolean;
  canFinance: boolean;
}

/** Jumps between main / CRM / Finance product surfaces (subdomain or local cookie). */
export function WorkspaceSwitcher({ module, orgSlug, canCrm, canFinance }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const root = publicEnv.appRootDomain;
  const current = MODULES.find((m) => m.id === module) ?? MODULES[0]!;
  const CurrentIcon = current.icon;

  const visible = MODULES.filter((m) => {
    if (m.id === 'crm') return canCrm;
    if (m.id === 'finance') return canFinance;
    return true;
  });

  const go = (next: WorkspaceModule) => {
    if (next === module) return;
    if (root && orgSlug) {
      start(async () => {
        await prepareWorkspaceHopAction();
        window.location.href = workspaceHref({ module: next, orgSlug, rootDomain: root });
      });
      return;
    }
    start(async () => {
      await switchWorkspaceModuleAction(next);
      document.cookie = `${WORKSPACE_MODULE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      router.push(homePathForModule(next));
      router.refresh();
    });
  };

  if (visible.length < 2) return null;

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={pending}
        className="nav-link hidden items-center gap-1.5 outline-none sm:inline-flex"
        aria-label={t('workspace.switch')}
      >
        <CurrentIcon className="size-3.5" aria-hidden />
        <span>{t(current.labelKey)}</span>
        <ChevronDown className="size-3" aria-hidden />
      </Menu.Trigger>
      <Menu.Content className="w-56 p-1">
        <Menu.Label>{t('workspace.switch')}</Menu.Label>
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <Menu.Item key={item.id} disabled={pending} onSelect={() => go(item.id)}>
              <Icon className="size-3.5" aria-hidden />
              <span className="flex-1">{t(item.labelKey)}</span>
              {item.id === module ? <span className="text-[10px] uppercase tracking-wide text-muted">{t('workspace.current')}</span> : null}
            </Menu.Item>
          );
        })}
      </Menu.Content>
    </Menu.Root>
  );
}
