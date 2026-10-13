'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { loginSchema, type LoginInput } from '@agency-os/contracts';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { loginAction } from '../actions/auth.actions';
import { GoogleSignInButton } from './google-sign-in-button';

export function LoginForm({
  defaultEmail,
  googleClientId = '',
}: {
  defaultEmail?: string;
  googleClientId?: string;
}) {
  const [formError, setFormError] = useState<string>();
  const [hydrated, setHydrated] = useState(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => setHydrated(true), []);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: defaultEmail ?? '', password: '' } });

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result && !result.ok) setFormError(result.message);
    });
  });

  return (
    <div className="space-y-5">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit(event);
        }}
      >
        <Field label={t('auth.login.email')} htmlFor="login-email" error={translateError(form.formState.errors.email?.message)}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            className="auth-field"
            placeholder={t('auth.email.placeholder')}
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
        </Field>
        <Field label={t('auth.login.password')} htmlFor="login-password" error={translateError(form.formState.errors.password?.message)}>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="auth-field"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
        </Field>
        <p className="text-right text-xs">
          <Link href="/forgot-password" className="text-muted underline-offset-2 hover:text-foreground hover:underline">
            {t('auth.forgot.link')}
          </Link>
        </p>
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" className="auth-cta w-full" disabled={pending || !hydrated}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {t('auth.login.submit')}
        </Button>
      </form>
      {googleClientId ? <GoogleSignInButton clientId={googleClientId} mode="login" /> : null}
    </div>
  );
}
