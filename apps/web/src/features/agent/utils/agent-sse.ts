import type { AgentStreamEvent } from '@agency-os/contracts';

export function processSseBuffer(
  buffer: string,
  onEvent: (event: AgentStreamEvent) => void,
): string {
  let rest = buffer;
  let boundary = rest.indexOf('\n\n');
  while (boundary !== -1) {
    const complete = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    for (const event of parseSseEvents(complete)) {
      onEvent(event);
    }
    boundary = rest.indexOf('\n\n');
  }
  return rest;
}

export function parseSseEvents(chunk: string): AgentStreamEvent[] {
  const events: AgentStreamEvent[] = [];
  for (const part of chunk.split('\n\n')) {
    const line = part
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('data:'));
    const payload = line?.slice(5).trim();
    if (!payload) continue;
    try {
      events.push(JSON.parse(payload) as AgentStreamEvent);
    } catch {
      continue;
    }
  }
  return events;
}
