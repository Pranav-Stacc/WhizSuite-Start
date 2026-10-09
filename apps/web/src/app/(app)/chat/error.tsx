'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/ui/button';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">Couldn’t load chat</h2>
      <p className="max-w-md text-sm text-muted">Something went wrong while loading conversations.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
