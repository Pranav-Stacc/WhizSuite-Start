import type { ChatMentionType } from '@agency-os/contracts';

export function hrefForMention(type: ChatMentionType, targetId: string, href?: string): string | undefined {
  if (href) return href;
  switch (type) {
    case 'USER':
      return `/team/${targetId}`;
    case 'CLIENT':
      return `/clients/${targetId}`;
    case 'PROJECT':
      return `/projects/${targetId}`;
    case 'CONTENT':
      return `/content/${targetId}`;
    case 'TASK':
      return `/tasks?highlight=${targetId}`;
    case 'CALENDAR_EVENT':
      return `/calendar?item=${encodeURIComponent(targetId)}`;
    case 'LEAD':
      return `/leads/${targetId}`;
    case 'AGENT':
      return '/chat?whiz=1';
    default:
      return undefined;
  }
}
