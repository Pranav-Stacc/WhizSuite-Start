import type { AgentStreamEvent } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';

export interface LiveToolStep {
  toolId: string;
  callId?: string;
  input?: Record<string, unknown>;
  running: boolean;
  ok?: boolean;
  error?: string;
  result?: unknown;
  expanded: boolean;
}

export interface StreamState {
  status: string;
  statusDetail?: string;
  text: string;
  steps: LiveToolStep[];
}

export function formatToolId(toolId: string): string {
  return toolId
    .split('.')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' · ');
}

export function formatStepDetail(step: LiveToolStep): string | null {
  if (step.running) return null;
  const parts: string[] = [];
  if (step.input && Object.keys(step.input).length > 0) {
    parts.push(`Input:\n${JSON.stringify(step.input, null, 2)}`);
  }
  if (step.result !== undefined && step.result !== null) {
    parts.push(
      `Result:\n${
        typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2)
      }`,
    );
  }
  if (parts.length === 0 && step.error) return step.error;
  return parts.length > 0 ? parts.join('\n\n') : null;
}

export function applyStreamEvent(prev: StreamState | null, event: AgentStreamEvent): StreamState {
  const base: StreamState = prev ?? { status: t('agent.thinking'), text: '', steps: [] };

  if (event.type === 'status') {
    const status =
      event.phase === 'summarizing'
        ? t('agent.phase.summarizing')
        : event.phase === 'executing' || event.phase === 'thinking'
          ? t('agent.thinking')
          : t('agent.phase.planning');
    return { ...base, status, statusDetail: event.detail };
  }

  if (event.type === 'tool.call.delta') {
    return {
      ...base,
      status: t('agent.thinking'),
      statusDetail: event.toolId,
    };
  }

  if (event.type === 'tool.start') {
    return {
      ...base,
      status: t('agent.thinking'),
      steps: [
        ...base.steps,
        {
          toolId: event.toolId,
          callId: event.callId,
          input: event.input,
          running: true,
          expanded: false,
        },
      ],
    };
  }

  if (event.type === 'tool.result') {
    const index = base.steps.findIndex(
      (step) =>
        step.running &&
        (event.callId ? step.callId === event.callId : step.toolId === event.toolId),
    );
    const next = [...base.steps];
    if (index >= 0) {
      const prior = next[index];
      next[index] = {
        ...prior,
        running: false,
        ok: event.ok,
        error: event.error,
        result: event.result,
      };
    } else {
      next.push({
        toolId: event.toolId,
        callId: event.callId,
        running: false,
        ok: event.ok,
        error: event.error,
        result: event.result,
        expanded: false,
      });
    }
    return { ...base, status: t('agent.thinking'), steps: next };
  }

  if (event.type === 'summary.delta') {
    return {
      ...base,
      status: t('agent.phase.summarizing'),
      text: base.text + event.text,
    };
  }

  return base;
}
