'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { claimPortalAccessSchema, type ClaimPortalAccessInput } from '@agency-os/contracts';
import { Loader2 } from 'lucide-react';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { claimPortalAccessAction } from '@/features/auth/actions/auth.actions';

/** Banner + form so temporary portal clients can create a lasting password login. */
export function ClaimPermanentLogin() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const form = useForm<ClaimPortalAccessInput>({
    resolver: zodResolver(claimPortalAccessSchema),
    defaultValues: { password: '' },
  });

  if (done) {
    return (
      <p className="rounded-md border border-border-soft bg-surface-2 px-4 py-3 text-sm text-muted">
        {t('auth.portalAccess.claimSuccess')}
      </p>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-soft bg-surface-2 px-4 py-3">
        <p className="text-sm text-muted">{t('auth.portalAccess.claimBanner')}</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {t('auth.portalAccess.claimOpen')}
        </Button>
      </div>
    );
  }

  const submit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await claimPortalAccessAction(values);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setDone(true);
    });
  });

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-border-soft bg-surface-2 p-4">
      <p className="text-sm text-muted">{t('auth.portalAccess.claimDesc')}</p>
      <Field label={t('auth.register.password')} htmlFor="claim-password" error={translateError(form.formState.errors.password?.message)} required>
        <Input id="claim-password" type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {t('auth.portalAccess.claimSubmit')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
