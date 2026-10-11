'use client';

import Link from 'next/link';
import type { ChatRoomDto } from '@agency-os/contracts';
import { ArrowLeft, Users } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

interface ChatGroupDetailProps {
  room: ChatRoomDto;
  membersById: Record<string, string>;
  backHref: string;
  threadHref: string;
}

export function ChatGroupDetail({ room, membersById, backHref, threadHref }: ChatGroupDetailProps) {
  const members = room.members ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {t('chat.group.back')}
          </Link>
        </Button>
        <Button variant="primary" size="sm" asChild className="ml-auto">
          <Link href={threadHref}>{t('chat.group.openChat')}</Link>
        </Button>
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{room.name ?? t('chat.untitled')}</h1>
            {room.description ? <p className="mt-1 text-[13px] text-muted">{room.description}</p> : null}
            <Badge tone="neutral" className="mt-2">
              {t('chat.type.group')} · {room.memberCount} {t('chat.members')}
            </Badge>
          </div>
        </div>
      </Card>

      <section aria-labelledby="chat-group-members">
        <h2 id="chat-group-members" className="eyebrow mb-3">
          {t('chat.group.members')}
        </h2>
        <ul className="divide-y divide-border-soft rounded-xl border border-border-soft bg-surface-1">
          {members.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-muted">{t('chat.group.members.empty')}</li>
          ) : (
            members.map((member) => {
              const name = membersById[member.userId] ?? t('chat.unknown');
              return (
                <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted">{member.role}</p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
