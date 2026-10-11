'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@agency-os/contracts';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { registerAction } from '../actions/auth.actions';
import { GoogleSignInButton } from './google-sign-in-button';

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function RegisterForm() {
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', organizationName: '', organizationSlug: '' },
  });
  const errors = form.formState.errors;
  const organizationName = form.watch('organizationName');
  const organizationSlug = form.watch('organizationSlug');

  const orgField = form.register('organizationName');

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
      <GoogleSignInButton
        mode="register"
        organizationName={organizationName?.trim() || undefined}
        organizationSlug={organizationSlug?.trim() || undefined}
      />
    </div>
  );
}
