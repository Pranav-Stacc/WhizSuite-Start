'use client';

import { useEffect, useState } from 'react';
import type { ChatMessageDto } from '@agency-os/contracts';
import { ChatMessageList } from './chat-message-list';
import { SendMessageForm, type MentionCandidate } from './send-message-form';

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
  const names =
    membersById instanceof Map
      ? membersById
      : new Map(Object.entries(membersById));

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ChatMessageList
          messages={localMessages}
          viewerId={viewerId}
          membersById={names}
          onReply={setReplyTo}
          activeReplyId={replyTo?.id}
        />
      </div>
      {canPost ? (
        <div className="border-t border-border-soft p-4">
          <SendMessageForm
            roomId={roomId}
            mentionCandidates={mentionCandidates}
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            membersById={names}
            onSent={(message) => setLocalMessages((current) => [...current, message])}
          />
        </div>
      ) : null}
    </>
  );
}
