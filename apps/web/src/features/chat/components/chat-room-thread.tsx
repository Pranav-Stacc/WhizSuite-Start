'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChatMessageDto } from '@agency-os/contracts';
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
}: {
  roomId: string;
  messages: ChatMessageDto[];
  viewerId: string;
  membersById: Map<string, string> | Record<string, string>;
  mentionCandidates?: MentionCandidate[];
  canPost: boolean;
}) {
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [localMessages, setLocalMessages] = useState(messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
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
  }, [localMessages]);

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
      </div>
      {canPost ? (
        <div className="shrink-0 border-t border-border-soft/80 bg-surface/40 p-3 sm:p-4">
          <SendMessageForm
            roomId={roomId}
            mentionCandidates={mentionCandidates}
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            membersById={names}
            onSent={(message) => {
              stickToBottomRef.current = true;
              setLocalMessages((current) => [...current, message]);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
