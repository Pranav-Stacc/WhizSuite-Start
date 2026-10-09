'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ZodType, ZodTypeDef } from 'zod';
import type { ActionResult } from '@/shared/data/action-result';
import { messages, t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import { PlatformBadge } from '@/shared/ui/platform';
import type { Platform } from '@agency-os/contracts';
import { FORM_SCHEMAS, type FormSchemaKey } from './form-schemas';

export type FieldType = 'text' | 'email' | 'textarea' | 'select' | 'date' | 'datetime-local' | 'number' | 'color' | 'platforms' | 'checkbox';

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  /** 2 = full width on wide dialogs. */
  span?: 1 | 2;
  rows?: number;
}

export interface FormDialogResult {
  href?: string;
  /** A link the user may need to share manually (e.g. an invitation when email delivery is unavailable). */
  shareLink?: string;
}

const SHARE_TOAST_DURATION_MS = 20_000;

export interface FormDialogProps {
  schema: FormSchemaKey;
  title: string;
  description?: string;
  submitLabel?: string;
  fields: FieldDef[];
  action: (values: Record<string, unknown>) => Promise<ActionResult<FormDialogResult | undefined>>;
  trigger?: ReactNode;
  defaults?: Record<string, unknown>;
  size?: 'sm' | 'md' | 'lg';
  /** Opens immediately (used by ?new=1 deep links from the quick-create menu). */
  defaultOpen?: boolean;
  successMessage?: string;
  /** Extra footer content on the left (e.g. a delete button). */
  footerExtra?: ReactNode;
}

export function translateError(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message in messages ? t(message as MessageKey) : message;
}

export function FormDialog({ schema, title, description, submitLabel, fields, action, trigger, defaults, size = 'md', defaultOpen = false, successMessage, footerExtra }: FormDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();

  // The registry is a union of heterogeneous contract schemas; the dialog treats values generically,
  // and the owning server action re-validates against the exact schema, so one widening cast is safe here.
  const formSchema = FORM_SCHEMAS[schema] as unknown as ZodType<FieldValues, ZodTypeDef, FieldValues>;
  const form = useForm<FieldValues>({
    resolver: zodResolver(formSchema) as Resolver<FieldValues>,
    defaultValues: defaults ?? {},
  });

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset(defaults ?? {});
      if (defaultOpen) {
        const next = new URLSearchParams(searchParams.toString());
        next.delete('new');
        next.delete('edit');
        router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
      }
    }
  };

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await action(values);
      if (result.ok) {
        const shareLink = result.data?.shareLink;
        toast.success(
          result.message ?? successMessage ?? t('toast.created'),
          shareLink
            ? {
                duration: SHARE_TOAST_DURATION_MS,
                action: {
                  label: t('action.copyLink'),
                  onClick: () => {
                    void navigator.clipboard.writeText(shareLink).then(() => toast.success(t('toast.linkCopied')));
                  },
                },
              }
            : undefined,
        );
        close(false);
        const href = result.data?.href;
        if (href) router.push(href);
        return;
      }
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(name, { message });
      }
      toast.error(result.message);
    });
  });

  return (
    <>
      {trigger ? (
        <span className="contents" onClick={() => setOpen(true)}>
          {trigger}
        </span>
      ) : null}
      <Modal
        open={open}
        onOpenChange={close}
        title={title}
        description={description}
        size={size}
        footer={
          <>
            {footerExtra ? <span className="mr-auto">{footerExtra}</span> : null}
            <Button variant="ghost" type="button" onClick={() => close(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" form={`form-${schema}-${title}`} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {submitLabel ?? t('common.create')}
            </Button>
          </>
        }
      >
        <form id={`form-${schema}-${title}`} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          {fields.map((def) => (
            <Field
              key={def.name}
              label={def.label}
              htmlFor={`${schema}-${def.name}`}
              required={def.required}
              hint={def.hint}
              error={translateError(form.formState.errors[def.name]?.message as string | undefined)}
              className={cn(def.span === 2 || def.type === 'textarea' || def.type === 'platforms' ? 'sm:col-span-2' : '')}
            >
              {renderControl(def, schema, form)}
            </Field>
          ))}
        </form>
      </Modal>
    </>
  );
}

function renderControl(def: FieldDef, schema: string, form: ReturnType<typeof useForm<FieldValues>>) {
  const id = `${schema}-${def.name}`;
  const invalid = Boolean(form.formState.errors[def.name]);
  const type = def.type ?? 'text';

  if (type === 'textarea') {
    return <Textarea id={id} rows={def.rows ?? 4} placeholder={def.placeholder} aria-invalid={invalid} {...form.register(def.name)} />;
  }
  if (type === 'select') {
    return (
      <Select id={id} aria-invalid={invalid} {...form.register(def.name)}>
        {!def.required ? <option value="">{t('common.none')}</option> : <option value="">—</option>}
        {def.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  }
  if (type === 'checkbox') {
    return (
      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5 text-sm">
        <input id={id} type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register(def.name)} />
        {def.placeholder}
      </label>
    );
  }
  if (type === 'color') {
    return (
      <Controller
        control={form.control}
        name={def.name}
        render={({ field }) => (
          <div className="flex items-center gap-3">
            <input id={id} type="color" value={field.value ?? '#00ff66'} onChange={field.onChange} className="size-10 shrink-0" />
            <Input value={field.value ?? ''} onChange={field.onChange} className="font-mono uppercase" aria-invalid={invalid} />
          </div>
        )}
      />
    );
  }
  if (type === 'platforms') {
    return (
      <Controller
        control={form.control}
        name={def.name}
        render={({ field }) => {
          const value: string[] = field.value ?? [];
          return (
            <div className="flex flex-wrap gap-2" role="group" aria-label={def.label}>
              {def.options?.map((o) => {
                const active = value.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => field.onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      active ? 'border-primary bg-primary/12 text-primary' : 'border-border-soft bg-surface-2 text-muted hover:border-border',
                    )}
                  >
                    <PlatformBadge platform={o.value as Platform} size="xs" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          );
        }}
      />
    );
  }
  return <Input id={id} type={type} placeholder={def.placeholder} aria-invalid={invalid} {...form.register(def.name)} />;
}
