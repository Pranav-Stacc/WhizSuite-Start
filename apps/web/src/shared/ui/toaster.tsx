'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      theme="dark"
      toastOptions={{
        classNames: {
          toast: '!border !border-border !bg-surface !text-foreground !rounded-xl !shadow-2xl',
          description: '!text-muted',
          success: '[&_[data-icon]]:!text-primary',
        },
      }}
    />
  );
}
