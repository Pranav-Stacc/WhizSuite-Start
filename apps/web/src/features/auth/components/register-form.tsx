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
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label={t('auth.register.firstName')} htmlFor="reg-first" error={translateError(errors.firstName?.message)}>
        <Input id="reg-first" autoComplete="given-name" {...form.register('firstName')} />
      </Field>
      <Field label={t('auth.register.lastName')} htmlFor="reg-last">
        <Input id="reg-last" autoComplete="family-name" {...form.register('lastName')} />
      </Field>
      <Field label={t('auth.login.email')} htmlFor="reg-email" className="sm:col-span-2" error={translateError(errors.email?.message)}>
        <Input id="reg-email" type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field label={t('auth.register.org')} htmlFor="reg-org" error={translateError(errors.organizationName?.message)}>
        <Input
          id="reg-org"
          autoComplete="organization"
          {...orgField}
          onChange={(e) => {
            void orgField.onChange(e);
            if (!form.formState.dirtyFields.organizationSlug) form.setValue('organizationSlug', toSlug(e.target.value), { shouldValidate: form.formState.isSubmitted });
          }}
        />
      </Field>
      <Field label={t('auth.register.slug')} htmlFor="reg-slug" hint={t('auth.register.slugHint')} error={translateError(errors.organizationSlug?.message)}>
        <Input id="reg-slug" {...form.register('organizationSlug')} />
      </Field>
      <Field label={t('auth.register.password')} htmlFor="reg-password" className="sm:col-span-2" error={translateError(errors.password?.message)}>
        <Input id="reg-password" type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      {formError ? (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger sm:col-span-2">
          {formError}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" className="w-full sm:col-span-2" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('auth.register.submit')}
      </Button>
    </form>
  );
}
