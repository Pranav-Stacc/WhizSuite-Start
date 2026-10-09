'use client';

import { useState, useTransition } from 'react';
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

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: defaultEmail ?? '', password: '' } });

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result && !result.ok) setFormError(result.message);
    });
  });

  return (
    <div className="space-y-4">
      <GoogleSignInButton mode="login" />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('auth.login.email')} htmlFor="login-email" error={translateError(form.formState.errors.email?.message)}>
          <Input id="login-email" type="email" autoComplete="email" placeholder={t('auth.email.placeholder')} aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />
        </Field>
        <Field label={t('auth.login.password')} htmlFor="login-password" error={translateError(form.formState.errors.password?.message)}>
          <Input id="login-password" type="password" autoComplete="current-password" aria-invalid={Boolean(form.formState.errors.password)} {...form.register('password')} />
        </Field>
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {t('auth.login.submit')}
        </Button>
      </form>
    </div>
  );
}
