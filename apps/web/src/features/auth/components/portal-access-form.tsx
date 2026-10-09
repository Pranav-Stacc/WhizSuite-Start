'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { redeemPortalAccessSchema, type RedeemPortalAccessInput } from '@agency-os/contracts';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { redeemPortalAccessAction } from '../actions/auth.actions';

interface PortalAccessFormProps {
  token: string;
  passwordRequired: boolean;
  organizationName: string;
  clientName: string | null;
  accessMode: 'TEMPORARY' | 'PERMANENT';
  membershipTtlHours: number | null;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
}

export function PortalAccessForm({
  token,
  passwordRequired,
  organizationName,
  clientName,
  accessMode,
  membershipTtlHours,
  appStoreUrl,
  playStoreUrl,
}: PortalAccessFormProps) {
  const [wantPassword, setWantPassword] = useState(passwordRequired);
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useForm<RedeemPortalAccessInput>({
    resolver: zodResolver(redeemPortalAccessSchema),
    defaultValues: { token, email: '', firstName: '', lastName: '', password: undefined },
  });
  const errors = form.formState.errors;
  const labelClient = clientName ?? organizationName;

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await redeemPortalAccessAction({
        ...values,
        password: wantPassword ? values.password : undefined,
      });
      if (result && !result.ok) {
        for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(name as keyof RedeemPortalAccessInput, { message });
        }
        setFormError(result.message);
      }
    });
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <p className="rounded-md border border-border-soft bg-surface-2 px-3 py-2 text-sm text-muted sm:col-span-2">
        {accessMode === 'TEMPORARY'
          ? t('auth.portalAccess.temporaryNote', {
              hours: String(membershipTtlHours ?? 168),
              org: organizationName,
              client: labelClient,
            })
          : t('auth.portalAccess.permanentNote', { org: organizationName, client: labelClient })}
      </p>

      {(appStoreUrl || playStoreUrl) && (
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {appStoreUrl ? (
            <Button asChild variant="secondary" size="sm">
              <a href={appStoreUrl} target="_blank" rel="noreferrer">
                {t('auth.portalAccess.appStore')}
              </a>
            </Button>
          ) : null}
          {playStoreUrl ? (
            <Button asChild variant="secondary" size="sm">
              <a href={playStoreUrl} target="_blank" rel="noreferrer">
                {t('auth.portalAccess.playStore')}
              </a>
            </Button>
          ) : null}
        </div>
      )}

      <Field label={t('auth.register.firstName')} htmlFor="pa-first" error={translateError(errors.firstName?.message)} required>
        <Input id="pa-first" autoComplete="given-name" {...form.register('firstName')} />
      </Field>
      <Field label={t('auth.register.lastName')} htmlFor="pa-last" error={translateError(errors.lastName?.message)}>
        <Input id="pa-last" autoComplete="family-name" {...form.register('lastName')} />
      </Field>
      <Field label={t('auth.login.email')} htmlFor="pa-email" className="sm:col-span-2" error={translateError(errors.email?.message)} required>
        <Input id="pa-email" type="email" autoComplete="email" {...form.register('email')} />
      </Field>

      {!passwordRequired ? (
        <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
          <input type="checkbox" checked={wantPassword} onChange={(e) => setWantPassword(e.target.checked)} />
          {t('auth.portalAccess.setPasswordNow')}
        </label>
      ) : null}

      {wantPassword ? (
        <Field
          label={passwordRequired ? t('auth.register.password') : t('auth.portalAccess.passwordOptional')}
          htmlFor="pa-password"
          className="sm:col-span-2"
          error={translateError(errors.password?.message)}
          hint={passwordRequired ? undefined : t('auth.portalAccess.passwordOptionalHint')}
          required={passwordRequired}
        >
          <Input id="pa-password" type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
      ) : null}

      {formError ? (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger sm:col-span-2">
          {formError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" className="w-full sm:col-span-2" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('auth.portalAccess.continue')}
      </Button>
    </form>
  );
}
