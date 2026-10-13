'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@agency-os/contracts';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { googleAuthAction, registerAction } from '../actions/auth.actions';
import {
  clearPendingGoogleIdToken,
  readPendingGoogleIdToken,
} from '../utils/google-pending-signup';
import { GoogleSignInButton } from './google-sign-in-button';

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function RegisterForm({ googleClientId = '' }: { googleClientId?: string }) {
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [pendingGoogle, setPendingGoogle] = useState(false);
  const [googlePending, startGoogle] = useTransition();

  useEffect(() => {
    setPendingGoogle(Boolean(readPendingGoogleIdToken()));
  }, []);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', organizationName: '', organizationSlug: '' },
  });
  const errors = form.formState.errors;
  const organizationName = form.watch('organizationName');
  const organizationSlug = form.watch('organizationSlug');

  const orgField = form.register('organizationName');

  const finishGoogleSignup = () => {
    const token = readPendingGoogleIdToken();
    const name = organizationName?.trim() ?? '';
    const slug = organizationSlug?.trim() ?? '';
    if (!token) return;
    if (name.length < 2 || !/^[a-z0-9-]+$/.test(slug)) {
      setFormError(t('auth.google.workspaceRequired'));
      return;
    }
    setFormError(undefined);
    startGoogle(async () => {
      const result = await googleAuthAction({
        idToken: token,
        organizationName: name,
        organizationSlug: slug,
      });
      if (!result || result.ok) {
        clearPendingGoogleIdToken();
        return;
      }
      setFormError(result.message);
    });
  };

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await registerAction(values);
      if (result && !result.ok) {
        for (const [name, message] of Object.entries(result.fieldErrors ?? {})) form.setError(name as keyof RegisterInput, { message });
        setFormError(result.message);
      }
    });
  });

  return (
    <div className="space-y-4">
      {pendingGoogle ? (
        <p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
          {t('auth.google.pendingSignup')}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('auth.register.org')} htmlFor="reg-org-google" error={translateError(errors.organizationName?.message)}>
          <Input
            id="reg-org-google"
            className="auth-field"
            autoComplete="organization"
            {...orgField}
            onChange={(e) => {
              void orgField.onChange(e);
              if (!form.formState.dirtyFields.organizationSlug) {
                form.setValue('organizationSlug', toSlug(e.target.value), {
                  shouldValidate: form.formState.isSubmitted,
                });
              }
            }}
          />
        </Field>
        <Field label={t('auth.register.slug')} htmlFor="reg-slug-google" hint={t('auth.register.slugHint')} error={translateError(errors.organizationSlug?.message)}>
          <Input id="reg-slug-google" className="auth-field" {...form.register('organizationSlug')} />
        </Field>
      </div>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label={t('auth.register.firstName')} htmlFor="reg-first" error={translateError(errors.firstName?.message)}>
          <Input id="reg-first" className="auth-field" autoComplete="given-name" {...form.register('firstName')} />
        </Field>
        <Field label={t('auth.register.lastName')} htmlFor="reg-last">
          <Input id="reg-last" className="auth-field" autoComplete="family-name" {...form.register('lastName')} />
        </Field>
        <Field label={t('auth.login.email')} htmlFor="reg-email" className="sm:col-span-2" error={translateError(errors.email?.message)}>
          <Input id="reg-email" type="email" className="auth-field" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label={t('auth.register.password')} htmlFor="reg-password" className="sm:col-span-2" error={translateError(errors.password?.message)}>
          <Input id="reg-password" type="password" className="auth-field" autoComplete="new-password" {...form.register('password')} />
        </Field>
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger sm:col-span-2">
            {formError}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" className="auth-cta w-full sm:col-span-2" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {t('auth.register.submit')}
        </Button>
      </form>
      {pendingGoogle ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="auth-cta w-full"
          disabled={googlePending || pending}
          onClick={finishGoogleSignup}
        >
          {googlePending ? <Loader2 className="animate-spin" /> : null}
          {t('auth.google.finishSignup')}
        </Button>
      ) : null}
      {googleClientId && !pendingGoogle ? (
        <GoogleSignInButton
          clientId={googleClientId}
          mode="register"
          organizationName={organizationName?.trim() || undefined}
          organizationSlug={organizationSlug?.trim() || undefined}
        />
      ) : null}
    </div>
  );
}
