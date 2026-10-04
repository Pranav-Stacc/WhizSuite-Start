import Link from 'next/link';
import type { ContentStatus, InvoiceStatus, Platform, ProjectStatus } from '@agency-os/contracts';
import { Globe, Mail, Palette, Pencil, Plus, UserRound } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { formatDate, formatMoney, formatNumber, relativeTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { EmptyState, Progress } from '@/shared/ui/feedback';
import { PlatformBadge, PlatformStack } from '@/shared/ui/platform';
import { StatusBadge } from '@/shared/ui/status';
import type { Client } from '../data/clients.repository';
import { BrandKitDialog } from './client-dialogs';

// Structural row shapes keep this feature independent of other domains' internals;
// the page composes them from each owning module's public service.
export interface ChannelRow {
  id: string;
  platform: Platform;
  handle: string;
  connected: boolean;
  followers: number;
}
export interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  progress: number;
}
export interface PostRow {
  id: string;
  title: string;
  platforms: Platform[];
  status: ContentStatus;
  updatedAt: string;
}
export interface InvoiceRow {
  id: string;
  number: string;
  issueDate: string;
  status: InvoiceStatus;
  total: number;
}

export function OverviewTab({ client, ownerName, integrations }: { client: Client; ownerName?: string; integrations: ChannelRow[] }) {
  const connected = integrations.filter((i) => i.connected);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader title={t('clients.contact')} icon={<UserRound />} />
        <CardBody className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Avatar name={client.contactName || client.name} size="md" />
            <div className="min-w-0">
              <p className="truncate font-medium">{client.contactName || '—'}</p>
              <p className="text-xs text-muted">{t('clients.since', { date: formatDate(client.since) })}</p>
            </div>
          </div>
          {client.contactEmail ? (
            <a href={`mailto:${client.contactEmail}`} className="flex items-center gap-2 text-muted hover:text-primary">
              <Mail className="size-4" />
              <span className="truncate">{client.contactEmail}</span>
            </a>
          ) : null}
          {client.website ? (
            <p className="flex items-center gap-2 text-muted">
              <Globe className="size-4" />
              <span className="truncate">{client.website}</span>
            </p>
          ) : null}
          {ownerName ? (
            <div className="flex items-center gap-2 border-t border-border-soft pt-3">
              <Avatar name={ownerName} size="xs" />
              <span className="text-muted">{t('clients.owner')}:</span>
              <span className="font-medium">{ownerName}</span>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader
          title={t('clients.channels')}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/integrations">{t('clients.channels.manage')}</Link>
            </Button>
          }
        />
        <CardBody>
          {connected.length === 0 ? (
            <EmptyState title={t('clients.channels.empty')} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {connected.map((integration) => (
                <li key={integration.id} className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-2 p-3">
                  <PlatformBadge platform={integration.platform} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{integration.handle}</p>
                    <p className="text-xs text-muted">{t('clients.followers', { count: formatNumber(integration.followers, true) })}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export function BrandTab({ client, canEdit }: { client: Client; canEdit: boolean }) {
  const swatches = [
    { label: t('clients.brand.primary'), value: client.brand.primary },
    { label: t('clients.brand.secondary'), value: client.brand.secondary },
    { label: t('clients.brand.accent'), value: client.brand.accent },
  ];
  return (
    <Card>
      <CardHeader
        title={t('clients.brand.title')}
        description={t('clients.brand.desc')}
        icon={<Palette />}
        action={
          canEdit ? (
            <BrandKitDialog
              client={client}
              trigger={
                <Button variant="secondary" size="sm">
                  <Pencil />
                  {t('clients.brand.edit')}
                </Button>
              }
            />
          ) : undefined
        }
      />
      <CardBody className="grid gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-3 gap-3">
          {swatches.map((swatch) => (
            <div key={swatch.label} className="overflow-hidden rounded-xl border border-border-soft">
              <div className="h-20" style={{ background: swatch.value }} />
              <div className="bg-surface-2 p-2.5">
                <p className="text-xs text-muted">{swatch.label}</p>
                <p className="font-mono text-xs uppercase">{swatch.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t('clients.brand.voice')}</p>
            <p>{client.brand.voice || <span className="text-muted">{t('clients.brand.voice.empty')}</span>}</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t('clients.brand.pillars')}</p>
            <ul className="flex flex-wrap gap-2">
              {client.brand.pillars.map((pillar) => (
                <li key={pillar} className="rounded-full border border-border-soft bg-surface-2 px-3 py-1 text-[13px]">
                  {pillar}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t('clients.brand.hashtags')}</p>
            <ul className="flex flex-wrap gap-2">
              {client.brand.hashtags.map((tag) => (
                <li key={tag} className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs text-primary">
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function WorkTab({ clientId, projects, posts }: { clientId: string; projects: ProjectRow[]; posts: PostRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          title={t('clients.projects')}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects?new=1">
                <Plus />
                {t('projects.new')}
              </Link>
            </Button>
          }
        />
        <CardBody className="pt-3">
          {projects.length === 0 ? (
            <p className="text-sm text-muted">{t('clients.projects.empty')}</p>
          ) : (
            <ul className="space-y-4">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link href={`/projects/${project.id}`} className="block rounded-lg p-2 transition-colors hover:bg-surface-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{project.name}</span>
                      <StatusBadge kind="project" value={project.status} />
                    </div>
                    <Progress value={project.progress} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('clients.content')}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/content?new=1&client=${clientId}`}>
                <Plus />
                {t('clients.content.new')}
              </Link>
            </Button>
          }
        />
        <CardBody className="pt-3">
          {posts.length === 0 ? (
            <p className="text-sm text-muted">{t('clients.content.empty')}</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link href={`/content/${post.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{post.title}</span>
                      <span className="block text-xs text-muted">{relativeTime(post.updatedAt)}</span>
                    </span>
                    <PlatformStack platforms={post.platforms} size="xs" />
                    <StatusBadge kind="content" value={post.status} dot={false} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export function BillingTab({ clientId, invoices }: { clientId: string; invoices: InvoiceRow[] }) {
  return (
    <Card>
      <CardHeader
        title={t('clients.invoices')}
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/invoices?new=1&client=${clientId}`}>
              <Plus />
              {t('clients.invoices.new')}
            </Link>
          </Button>
        }
      />
      <CardBody className="pt-3">
        {invoices.length === 0 ? (
          <p className="text-sm text-muted">{t('clients.invoices.empty')}</p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{invoice.number}</span>
                    <span className="block text-xs text-muted">{formatDate(invoice.issueDate)}</span>
                  </span>
                  <StatusBadge kind="invoice" value={invoice.status} />
                  <span className="w-28 text-right text-sm font-semibold tabular-nums">{formatMoney(invoice.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
