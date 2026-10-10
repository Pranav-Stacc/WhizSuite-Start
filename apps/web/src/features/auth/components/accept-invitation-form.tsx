'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { acceptInvitationSchema, type AcceptInvitationInput } from '@agency-os/contracts';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { acceptInvitationAction } from '../actions/auth.actions';

interface AcceptInvitationFormProps {
  token: string;
  email: string;
  hasAccount: boolean;
}

export function AcceptInvitationForm({ token, email, hasAccount }: AcceptInvitationFormProps) {
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token, firstName: '', lastName: '', password: '' },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    if (!hasAccount && !values.firstName) {
      form.setError('firstName', { message: 'validation.required' });
      return;
    }
    setFormError(undefined);
    startTransition(async () => {
      const result = await acceptInvitationAction(values);
      if (result && !result.ok) {
        for (const [name, message] of Object.entries(result.fieldErrors ?? {})) form.setError(name as keyof AcceptInvitationInput, { message });
        setFormError(result.message);
      }
    });
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label={t('auth.login.email')} htmlFor="inv-email" className="sm:col-span-2">
        <Input id="inv-email" type="email" value={email} readOnly autoComplete="email" />
      </Field>
      {hasAccount ? null : (
        <>
          <Field label={t('auth.register.firstName')} htmlFor="inv-first" error={translateError(errors.firstName?.message)}>
            <Input id="inv-first" autoComplete="given-name" {...form.register('firstName')} />
          </Field>
          <Field label={t('auth.register.lastName')} htmlFor="inv-last">
            <Input id="inv-last" autoComplete="family-name" {...form.register('lastName')} />
          </Field>
        </>
      )}
      <Field
        label={t('auth.register.password')}
        htmlFor="inv-password"
        className="sm:col-span-2"
        error={translateError(errors.password?.message)}
      >
        <Input
          id="inv-password"
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
      </Field>
      {formError ? (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger sm:col-span-2">
          {formError}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" className="w-full sm:col-span-2" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('auth.invite.submit')}
      </Button>
    </form>
  );
}
