import {
  WHIZ_AGENT_DISPLAY,
  WHIZ_AGENT_TARGET_ID,
  type ChatMentionType,
} from '@agency-os/contracts';

const WHIZ_BODY_MENTION = /(?:^|[\s([{])@whiz\b/i;

export function mentionsWhiz(
  body: string,
  mentions: Array<{ type?: ChatMentionType | string; targetId: string; displayText?: string }>,
): boolean {
  if (
    mentions.some(
      (m) =>
        m.type === 'AGENT' ||
        m.targetId === WHIZ_AGENT_TARGET_ID ||
        m.displayText?.toLowerCase() === WHIZ_AGENT_DISPLAY.toLowerCase(),
    )
  ) {
    return true;
  }
  return WHIZ_BODY_MENTION.test(body);
}

export function buildRoomWhizPrompt(roomId: string, triggerMessageId: string, body: string): string {
  return [
    'You are Whiz, mentioned with @Whiz in a team chat room.',
    'Use available tools to fulfill the request (clients, tasks, content, calendar, reminders, chat, etc.).',
    'Prefer executing tools when intent is clear. Use exact tool input field names.',
    'Reply concisely in plain text suitable for chat — no markdown fences.',
    `Organization context: roomId=${roomId}`,
    `Trigger message ID: ${triggerMessageId}`,
    `User request: ${body}`,
  ].join('\n');
}
