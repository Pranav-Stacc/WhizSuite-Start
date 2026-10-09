'use client';

import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { googleAuthAction } from '../actions/auth.actions';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              width?: number;
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  organizationName?: string;
  organizationSlug?: string;
  mode?: 'login' | 'register';
};

function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('gis')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('gis'));
    document.head.appendChild(script);
  });
}

/** Renders Google Identity Services sign-in when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. */
export function GoogleSignInButton({
  organizationName,
  organizationSlug,
  mode = 'login',
}: GoogleSignInButtonProps) {
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [ready, setReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const hostId = useId();

  const onCredential = useCallback(
    (credential: string) => {
      setFormError(undefined);
      if (mode === 'register') {
        const name = organizationName?.trim() ?? '';
        const slug = organizationSlug?.trim() ?? '';
        if (name.length < 2 || !/^[a-z0-9-]+$/.test(slug)) {
          setFormError(t('auth.google.workspaceRequired'));
          return;
        }
      }
      startTransition(async () => {
        const result = await googleAuthAction({
          idToken: credential,
          organizationName,
          organizationSlug,
        });
        if (result && !result.ok) setFormError(result.message);
      });
    },
    [mode, organizationName, organizationSlug],
  );

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadGis();
        if (cancelled || !hostRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredential(response.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        hostRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(hostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          width: 320,
        });
        setReady(true);
      } catch {
        if (!cancelled) setFormError(t('auth.google.unavailable'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, onCredential]);

  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-3">
      <div className="relative py-1 text-center text-xs text-muted before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-border-soft">
        <span className="relative bg-background px-3">{t('auth.login.orGoogle')}</span>
      </div>
      <div className="flex min-h-11 flex-col items-center justify-center gap-2">
        {pending ? (
          <Button type="button" variant="outline" size="lg" className="w-full max-w-xs" disabled>
            <Loader2 className="animate-spin" />
            {t('auth.google.pending')}
          </Button>
        ) : (
          <div id={hostId} ref={hostRef} className={ready ? undefined : 'invisible h-11 w-80'} />
        )}
      </div>
      {formError ? (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
