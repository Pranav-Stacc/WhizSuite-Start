'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { t, type MessageKey } from '@/shared/i18n/t';
import { CLIENT_WORKSPACE_SECTIONS, clientSectionHref, type ClientSection } from '../workspace';

function activeSection(pathname: string, clientId: string): ClientSection {
  const rest = pathname.slice(`/clients/${clientId}`.length).split('/')[1] ?? '';
  return CLIENT_WORKSPACE_SECTIONS.find((section) => section === rest) ?? 'overview';
}

/** Breadcrumb on the left, the client's sections on the right — the client is the workspace. */
export function ClientWorkspaceNav({ clientId, clientName, sections }: { clientId: string; clientName: string; sections: ClientSection[] }) {
  const pathname = usePathname();
  const active = activeSection(pathname, clientId);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-border-soft pb-3">
      <nav aria-label={t('clients.workspace.breadcrumb')} className="flex min-w-0 items-center gap-2 text-[12px] text-muted">
        <Link href="/clients" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3" aria-hidden />
          {t('nav.clients')}
        </Link>
        <span aria-hidden>/</span>
        <Link href={clientSectionHref(clientId, 'overview')} className="truncate uppercase tracking-[0.12em] hover:text-foreground">
          {clientName}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground" aria-current="page">
          {t(`clients.workspace.${active}` as MessageKey)}
        </span>
      </nav>
      <nav aria-label={t('clients.tabs.label')} className="no-scrollbar flex gap-5 overflow-x-auto">
        {sections.map((section) => (
          <Link key={section} href={clientSectionHref(clientId, section)} aria-current={section === active ? 'page' : undefined} className="nav-link whitespace-nowrap">
            {t(`clients.workspace.${section}` as MessageKey)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
