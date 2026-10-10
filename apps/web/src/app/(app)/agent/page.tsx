import { Permissions } from '@agency-os/contracts';
import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { AgentWorkspace } from '@/features/agent/components/agent-workspace';
import {
  createAgentSession,
  getAgentSession,
  listAgentDefinitions,
  listAgentPending,
  listAgentRuns,
  listAgentSchedules,
  listAgentSessions,
  listCapabilities,
} from '@/features/agent/services/agent.service';
import { can, requirePermission } from '@/shared/auth/permissions';
import { t } from '@/shared/i18n/t';
import { param, type SearchParams } from '@/shared/ui/nav-controls';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: t('agent.title') };

export default async function AgentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePermission(Permissions.AI_CHAT);
  const orgId = session.orgId!;
  const sp = await searchParams;
  let sessionId = param(sp, 'session');

  let sessions = await listAgentSessions(orgId).catch(() => []);
  if (sessions.length === 0) {
    try {
      const created = await createAgentSession(orgId);
      sessions = [created];
      sessionId = created.id;
    } catch {
      sessions = [];
    }
  }
  if (!sessionId) sessionId = sessions[0]?.id;

  const canManageAgents = await can(Permissions.AI_AGENTS_MANAGE);

  const [detail, runs, pending, tools, definitions, schedules] = await Promise.all([
    sessionId ? getAgentSession(orgId, sessionId).catch(() => null) : null,
    listAgentRuns(orgId).catch(() => []),
    listAgentPending(orgId).catch(() => []),
    listCapabilities(orgId).catch(() => []),
    canManageAgents ? listAgentDefinitions(orgId) : Promise.resolve([]),
    canManageAgents ? listAgentSchedules(orgId) : Promise.resolve([]),
  ]);

  const selectedSession = sessions.find((s) => s.id === sessionId) ?? sessions[0] ?? null;

  return (
    <div>
      <PageHeader
        title={t('agent.title')}
        description={t('agent.description')}
        eyebrow={<Sparkles className="inline size-3.5" />}
      />
      <AgentWorkspace
        sessions={sessions}
        selectedSession={selectedSession}
        messages={detail?.messages ?? []}
        runs={runs}
        pendingActions={pending}
        tools={tools}
        definitions={definitions}
        schedules={schedules}
        sessionId={sessionId}
        canManageAgents={canManageAgents}
      />
    </div>
  );
}
