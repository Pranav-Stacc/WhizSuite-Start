'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { resetPasswordAction } from '../actions/auth.actions';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!token) {
    return (
      <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
        {t('auth.reset.missingToken')}
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        startTransition(async () => {
          const result = await resetPasswordAction(token, password);
          if (result.ok) {
            router.push('/login?reset=1');
            return;
          }
          setError(result.message);
        });
      }}
    >
      <Field label={t('auth.reset.password')} htmlFor="reset-password">
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          className="auth-field"
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      {error ? (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" className="auth-cta w-full" disabled={pending || password.length < 12}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('auth.reset.submit')}
      </Button>
    </form>
  );
}
