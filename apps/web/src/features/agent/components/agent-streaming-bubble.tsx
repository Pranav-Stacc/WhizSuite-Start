'use client';

import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { AgentMarkdown } from './agent-markdown';
import {
  formatStepDetail,
  formatToolId,
  type StreamState,
} from '../utils/agent-stream-state';
import { t } from '@/shared/i18n/t';

export function AgentStreamingBubble({
  stream,
  onToggleStep,
}: {
  stream: StreamState;
  onToggleStep: (index: number) => void;
}) {
  const showCursor = stream.text.length > 0 && stream.status === t('agent.phase.summarizing');

  return (
    <div className="mr-auto max-w-[90%]">
      <div className="rounded-2xl rounded-tl-md border border-sky-500/35 bg-gradient-to-br from-sky-500/12 to-surface-2/80 px-4 py-3 text-sm shadow-sm">
        <div className="mb-3 flex items-center gap-3 text-muted">
          {stream.text ? null : <TypingDots />}
          <span className="text-xs font-medium">{stream.statusDetail ?? stream.status}</span>
        </div>

        {stream.steps.length > 0 ? (
          <div className="mb-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('agent.stream.steps')}
            </p>
            {stream.steps.map((step, index) => {
              const detail = formatStepDetail(step);
              return (
                <div
                  key={`${step.callId ?? step.toolId}-${index}`}
                  className="rounded-lg border border-border-soft/60 bg-surface/40"
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-2.5 py-2 text-left"
                    onClick={() => detail && onToggleStep(index)}
                    disabled={!detail}
                  >
                    {step.running ? (
                      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-sky-400" />
                    ) : step.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
                    )}
                    <span className="min-w-0 flex-1 text-xs font-medium">{formatToolId(step.toolId)}</span>
                    {detail ? (
                      step.expanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted" />
                      )
                    ) : null}
                  </button>
                  {step.expanded && detail ? (
                    <pre className="overflow-x-auto border-t border-border-soft/50 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
                      {detail}
                    </pre>
                  ) : null}
                  {!step.expanded && step.error ? (
                    <p className="px-2.5 pb-2 text-[11px] text-red-300">{step.error}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {stream.text ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('agent.stream.answer')}
            </p>
            <AgentMarkdown content={stream.text} />
            {showCursor ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-sky-400/80 align-middle"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span aria-hidden className="flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-sky-400/80"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
