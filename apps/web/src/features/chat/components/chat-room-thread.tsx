'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChatMessageDto } from '@agency-os/contracts';
import { AgentStreamingBubble } from '@/features/agent/components/agent-streaming-bubble';
import { useAgentStream } from '@/features/agent/hooks/use-agent-stream';
import { postWhizRoomReplyAction } from '../actions/chat.actions';
import { buildRoomWhizPrompt, mentionsWhiz } from '../utils/whiz-mention';
import { ChatMessageList } from './chat-message-list';
import { SendMessageForm, type MentionCandidate } from './send-message-form';

const NEAR_BOTTOM_PX = 140;

export function ChatRoomThread({
  roomId,
  messages,
  viewerId,
  membersById,
  mentionCandidates = [],
  canPost,
  whizSessionId,
  canUseWhiz = false,
}: {
  roomId: string;
  messages: ChatMessageDto[];
  viewerId: string;
  membersById: Map<string, string> | Record<string, string>;
  mentionCandidates?: MentionCandidate[];
  canPost: boolean;
  /** Agent session used when @Whiz is mentioned in this room. */
  whizSessionId?: string;
  canUseWhiz?: boolean;
}) {
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [localMessages, setLocalMessages] = useState(messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const { stream, error: streamError, isStreaming, runStream, toggleStep } = useAgentStream();
  const names =
    membersById instanceof Map
      ? membersById
      : new Map(Object.entries(membersById));

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useLayoutEffect(() => {
    stickToBottomRef.current = true;
    scrollToBottom('auto');
  }, [roomId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_PX;
    if (stickToBottomRef.current || nearBottom) {
      scrollToBottom(stickToBottomRef.current ? 'auto' : 'smooth');
    }
  }, [localMessages, stream?.text, stream?.status, stream?.steps.length]);

  const runWhizStream = useCallback(
    async (trigger: ChatMessageDto) => {
      if (!whizSessionId || !canUseWhiz) return;
      stickToBottomRef.current = true;
      const prompt = buildRoomWhizPrompt(roomId, trigger.id, trigger.body);
      const finalText = await runStream(whizSessionId, prompt);
      const reply =
        finalText.trim() ||
        'Whiz could not complete that right now. Try again or open the Agent screen.';
      const result = await postWhizRoomReplyAction(roomId, trigger.id, reply);
      if (result.ok) {
        setLocalMessages((current) => [...current, result.message]);
      }
    },
    [canUseWhiz, roomId, runStream, whizSessionId],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;
        }}
      >
        <ChatMessageList
          messages={localMessages}
          viewerId={viewerId}
          membersById={names}
          mentionCandidates={mentionCandidates}
          onReply={setReplyTo}
          activeReplyId={replyTo?.id}
        />
        {stream ? (
          <div className="mt-3">
            <AgentStreamingBubble stream={stream} onToggleStep={toggleStep} />
          </div>
        ) : null}
        {streamError ? (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {streamError}
          </div>
        ) : null}
      </div>
      {canPost ? (
        <div className="shrink-0 border-t border-border-soft/80 bg-surface/40 p-3 sm:p-4">
          <SendMessageForm
            roomId={roomId}
            mentionCandidates={mentionCandidates}
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            membersById={names}
            canUseWhiz={canUseWhiz}
            whizSessionReady={Boolean(whizSessionId)}
            onSent={(message, meta) => {
              stickToBottomRef.current = true;
              setLocalMessages((current) => [...current, message]);
              if (meta?.whizClientStream && !isStreaming) {
                void runWhizStream(message);
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
