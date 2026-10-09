'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { sendChatMessageAction } from '../actions/chat.actions';

export function SendMessageForm({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = body.trim();
        if (!value) return;
        startTransition(async () => {
          const result = await sendChatMessageAction(roomId, value);
          if (result.ok) {
            setBody('');
            router.refresh();
          }
        });
      }}
    >
      <label className="sr-only" htmlFor={`chat-composer-${roomId}`}>
        {t('chat.composer.label')}
      </label>
      <input
        id={`chat-composer-${roomId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('chat.composer.placeholder')}
        className="h-11 flex-1 rounded-xl border border-border-soft bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        disabled={pending}
        autoComplete="off"
      />
      <Button type="submit" disabled={pending || !body.trim()}>
        {t('chat.composer.send')}
      </Button>
    </form>
  );
}
