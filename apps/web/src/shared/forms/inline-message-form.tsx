'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { ActionResult } from '@/shared/data/action-result';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/field';
import { messageSchema } from '@agency-os/contracts';
import { translateError } from './form-dialog';

interface InlineMessageFormProps {
  action: (values: { body: string }) => Promise<ActionResult>;
  placeholder: string;
  submitLabel?: string;
  label: string;
  rows?: number;
}

/** Compact textarea + send button used for comments, replies and portal messages. */
export function InlineMessageForm({ action, placeholder, submitLabel, label, rows = 3 }: InlineMessageFormProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<{ body: string }>({ resolver: zodResolver(messageSchema), defaultValues: { body: '' } });

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await action(values);
      if (result.ok) {
        toast.success(result.message ?? t('toast.saved'));
        form.reset({ body: '' });
      } else {
        toast.error(result.message);
      }
    });
  });

  const error = translateError(form.formState.errors.body?.message);
  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <Textarea
        rows={rows}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={Boolean(error)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit();
        }}
        {...form.register('body')}
      />
      <div className="flex items-center justify-between gap-3">
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          {submitLabel ?? t('common.send')}
        </Button>
      </div>
    </form>
  );
}
