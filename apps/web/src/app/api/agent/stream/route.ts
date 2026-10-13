import { sendAgentMessageSchema } from '@agency-os/contracts';
import { NextResponse, type NextRequest } from 'next/server';
import { Permissions } from '@agency-os/contracts';
import { env } from '@/shared/config/env';
import { can } from '@/shared/auth/permissions';
import { getSession } from '@/shared/auth/session';
import { orgPath } from '@/shared/api/live/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Proxies Nest agent SSE so the browser never sees API tokens. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken || !session.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await can(Permissions.AI_CHAT))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    message?: string;
    agentDefinitionId?: string;
  } | null;

  if (!body?.sessionId || !body.message) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = sendAgentMessageSchema.safeParse({
    message: body.message,
    agentDefinitionId: body.agentDefinitionId || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  const upstreamUrl = new URL(
    `${env.API_BASE_URL.replace(/\/$/, '')}/${orgPath(
      session.orgId,
      `agent/sessions/${body.sessionId}/messages/stream`,
    ).replace(/^\//, '')}`,
  );

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      authorization: `Bearer ${session.accessToken}`,
      'x-organization-id': session.orgId,
    },
    body: JSON.stringify(parsed.data),
    signal: AbortSignal.timeout(Math.max(env.API_TIMEOUT_MS, 180_000)),
    cache: 'no-store',
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: detail || `Upstream ${upstream.status}` },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
