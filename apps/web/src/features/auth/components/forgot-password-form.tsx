'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { forgotPasswordAction } from '../actions/auth.actions';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        setMessage(undefined);
        startTransition(async () => {
          const result = await forgotPasswordAction(email.trim());
          if (result.ok) setMessage(result.message ?? t('auth.forgot.sent'));
          else setError(result.message);
        });
      }}
    >
      <Field label={t('auth.login.email')} htmlFor="forgot-email">
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          className="auth-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      {error ? (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}
      {message ? (
        <p role="status" className="rounded-lg bg-success/12 px-3 py-2 text-sm text-success">{message}</p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" className="auth-cta w-full" disabled={pending || !email.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('auth.forgot.submit')}
      </Button>
    </form>
  );
}
