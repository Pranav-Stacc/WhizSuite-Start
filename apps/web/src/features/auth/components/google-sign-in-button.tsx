'use client';

import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { googleAuthAction } from '../actions/auth.actions';
import { AuthFormDivider } from './auth-form-divider';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const GIS_MIN_WIDTH = 200;
const GIS_MAX_WIDTH = 400;

type GoogleSignInButtonProps = {
  clientId: string;
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

function measureButtonWidth(host: HTMLElement): number {
  const width = Math.floor(host.getBoundingClientRect().width);
  if (!width) return GIS_MAX_WIDTH;
  return Math.min(GIS_MAX_WIDTH, Math.max(GIS_MIN_WIDTH, width));
}

/** Renders Google Identity Services sign-in when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. */
export function GoogleSignInButton({
  clientId,
  organizationName,
  organizationSlug,
  mode = 'login',
}: GoogleSignInButtonProps) {
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [ready, setReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef(0);
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

  const paintButton = useCallback(() => {
    const host = hostRef.current;
    if (!host || !window.google?.accounts?.id || !clientId) return;
    const width = measureButtonWidth(host);
    if (width === lastWidthRef.current && host.childElementCount > 0) return;
    lastWidthRef.current = width;
    host.innerHTML = '';
    window.google.accounts.id.renderButton(host, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: mode === 'register' ? 'signup_with' : 'signin_with',
      shape: 'pill',
      width,
      logo_alignment: 'left',
    });
    setReady(true);
  }, [clientId, mode]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;

    void (async () => {
      try {
        await loadGis();
        if (cancelled || !hostRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredential(response.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        paintButton();
        observer = new ResizeObserver(() => {
          if (!cancelled) paintButton();
        });
        observer.observe(hostRef.current);
      } catch {
        if (!cancelled) setFormError(t('auth.google.unavailable'));
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [clientId, mode, onCredential, paintButton]);

  if (!clientId) return null;

  return (
    <div className="space-y-3">
      <AuthFormDivider />
      <div className="google-sign-in-host flex min-h-11 w-full flex-col items-stretch justify-center">
        {pending ? (
          <Button type="button" variant="outline" size="lg" className="auth-cta w-full" disabled>
            <Loader2 className="animate-spin" />
            {t('auth.google.pending')}
          </Button>
        ) : (
          <div
            id={hostId}
            ref={hostRef}
            className={ready ? 'w-full [&>div]:!w-full [&_iframe]:!w-full' : 'invisible h-11 w-full'}
          />
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
