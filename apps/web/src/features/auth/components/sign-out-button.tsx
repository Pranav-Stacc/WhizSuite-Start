'use client';

import { useTransition, type ReactNode } from 'react';
import { signOutAction } from '../actions/auth.actions';

export function SignOutButton({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition();
  return (
    <span className={pending ? 'pointer-events-none opacity-70' : undefined}>
      <button type="button" onClick={() => startTransition(() => void signOutAction())} className="contents">
        {children}
      </button>
    </span>
  );
}
