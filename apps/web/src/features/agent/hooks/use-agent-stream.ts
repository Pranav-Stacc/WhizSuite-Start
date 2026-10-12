'use client';

import { useCallback, useState } from 'react';
import type { AgentStreamEvent } from '@agency-os/contracts';
import { applyStreamEvent, type StreamState } from '../utils/agent-stream-state';
import { processSseBuffer } from '../utils/agent-sse';
import { t } from '@/shared/i18n/t';

export function useAgentStream() {
  const [stream, setStream] = useState<StreamState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isStreaming = stream !== null;

  const toggleStep = useCallback((index: number) => {
    setStream((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((step, i) =>
        i === index ? { ...step, expanded: !step.expanded } : step,
      );
      return { ...prev, steps };
    });
  }, []);

  const runStream = useCallback(
    async (sessionId: string, message: string, agentDefinitionId?: string): Promise<string> => {
      setError(null);
      setStream({ status: t('agent.thinking'), text: '', steps: [] });

      let finalText = '';
      const handleEvent = (event: AgentStreamEvent) => {
        if (event.type === 'done') {
          finalText = event.response || finalText;
          return 'done' as const;
        }
        if (event.type === 'error') {
          throw new Error(event.message);
        }
        setStream((prev) => {
          const next = applyStreamEvent(prev, event);
          if (event.type === 'summary.delta') {
            finalText = next.text;
          }
          return next;
        });
        return 'continue' as const;
      };

      try {
        const res = await fetch('/api/agent/stream', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message,
            agentDefinitionId: agentDefinitionId || undefined,
          }),
        });
        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => '');
          throw new Error(detail || t('agent.error.stream'));
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finished = false;

        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          buffer = processSseBuffer(buffer, (event) => {
            const outcome = handleEvent(event);
            if (outcome === 'done') finished = true;
          });
        }

        buffer += decoder.decode();
        if (buffer.trim()) {
          processSseBuffer(`${buffer}\n\n`, (event) => {
            const outcome = handleEvent(event);
            if (outcome === 'done') finished = true;
          });
        }

        return finalText;
      } catch (err) {
        setError(err instanceof Error ? err.message : t('agent.error.stream'));
        return finalText;
      } finally {
        setStream(null);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { stream, error, isStreaming, runStream, toggleStep, clearError, setError };
}
