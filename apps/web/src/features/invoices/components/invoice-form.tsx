'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Save, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createInvoiceSchema } from '@agency-os/contracts';
import type { ActionResult } from '@/shared/data/action-result';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { formatMoney, toMinorUnits } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { Field, Input, Select } from '@/shared/ui/field';

export interface InvoiceFormValues {
  clientId: string;
  dueDate: string;
  taxRate: number;
  lines: Array<{ description: string; quantity: number; unitPrice: number }>;
}

interface InvoiceFormProps {
  clients: Array<{ id: string; name: string }>;
  defaults: InvoiceFormValues;
  submit: (values: InvoiceFormValues, send: boolean) => Promise<ActionResult<{ href: string }>>;
  cancelHref: string;
  /** Shown above the form when editing an existing draft. */
  heading?: string;
}

const EMPTY_LINE = { description: '', quantity: 1, unitPrice: 0 } as const;

export function InvoiceForm({ clients, defaults, submit, cancelHref, heading }: InvoiceFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The contract schema coerces numeric strings; the form holds numbers, so the widened resolver type is safe.
  const form = useForm<InvoiceFormValues>({ resolver: zodResolver(createInvoiceSchema) as unknown as Resolver<InvoiceFormValues>, defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });
  const lines = useWatch({ control: form.control, name: 'lines' });
  const taxRate = useWatch({ control: form.control, name: 'taxRate' });

  const subtotal = (lines ?? []).reduce((total, line) => total + (Number(line.quantity) || 0) * toMinorUnits(Number(line.unitPrice) || 0), 0);
  const tax = Math.round((subtotal * (Number(taxRate) || 0)) / 100);
  const errors = form.formState.errors;

  const send = (shouldSend: boolean) =>
    form.handleSubmit((values) => {
      startTransition(async () => {
        const result = await submit(values, shouldSend);
        if (result.ok) {
          toast.success(result.message ?? t('toast.saved'));
          router.push(result.data?.href ?? cancelHref);
          return;
        }
        for (const [name, message] of Object.entries(result.fieldErrors ?? {})) form.setError(name as keyof InvoiceFormValues, { message });
        toast.error(result.message);
      });
    })();

  return (
    <form onSubmit={(event) => event.preventDefault()} noValidate className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Card>
          <CardHeader title={heading ?? t('invoices.form.details')} description={t('invoices.form.details.desc')} />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Field label={t('invoices.field.client')} htmlFor="inv-client" required error={translateError(errors.clientId?.message)}>
              <Select id="inv-client" aria-invalid={Boolean(errors.clientId)} {...form.register('clientId')}>
                <option value="">—</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('invoices.field.dueDate')} htmlFor="inv-due" required error={translateError(errors.dueDate?.message)}>
              <Input id="inv-due" type="date" aria-invalid={Boolean(errors.dueDate)} {...form.register('dueDate')} />
            </Field>
            <Field label={t('invoices.field.taxRate')} htmlFor="inv-tax" error={translateError(errors.taxRate?.message)}>
              <Input id="inv-tax" type="number" step="0.5" min={0} max={100} {...form.register('taxRate', { valueAsNumber: true })} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('invoices.form.lines')} description={t('invoices.form.lines.desc')} />
          <CardBody className="space-y-3">
            <div className="hidden grid-cols-[1fr_88px_128px_112px_36px] gap-3 px-1 text-xs font-medium uppercase tracking-wide text-muted sm:grid">
              <span>{t('invoices.line.description')}</span>
              <span>{t('invoices.line.quantity')}</span>
              <span>{t('invoices.line.unitPrice')}</span>
              <span className="text-right">{t('invoices.line.amount')}</span>
              <span />
            </div>
            {fields.map((field, index) => {
              const line = lines?.[index];
              const amount = (Number(line?.quantity) || 0) * toMinorUnits(Number(line?.unitPrice) || 0);
              const lineErrors = errors.lines?.[index];
              return (
                <div key={field.id} className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[1fr_88px_128px_112px_36px]">
                  <div className="col-span-2 sm:col-span-1">
                    <Input aria-label={t('invoices.line.description')} placeholder={t('invoices.line.description.placeholder')} aria-invalid={Boolean(lineErrors?.description)} {...form.register(`lines.${index}.description`)} />
                    {lineErrors?.description ? (
                      <p role="alert" className="mt-1 text-xs text-danger">
                        {translateError(lineErrors.description.message)}
                      </p>
                    ) : null}
                  </div>
                  <Input aria-label={t('invoices.line.quantity')} type="number" min={1} step="1" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                  <Input aria-label={t('invoices.line.unitPrice')} type="number" min={0} step="0.01" {...form.register(`lines.${index}.unitPrice`, { valueAsNumber: true })} />
                  <p className="flex h-10 items-center justify-end text-sm font-medium tabular-nums">{formatMoney(amount)}</p>
                  <Button type="button" variant="ghost" size="icon" aria-label={t('invoices.line.remove')} disabled={fields.length === 1} onClick={() => remove(index)}>
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
            {errors.lines?.message ? (
              <p role="alert" className="text-xs text-danger">
                {translateError(errors.lines.message)}
              </p>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => append({ ...EMPTY_LINE })}>
              <Plus />
              {t('invoices.line.add')}
            </Button>
          </CardBody>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title={t('invoices.form.summary')} />
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t('invoices.subtotal')}</span>
              <span className="tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('invoices.tax', { rate: Number(taxRate) || 0 })}</span>
              <span className="tabular-nums">{formatMoney(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-border-soft pt-3 text-base font-semibold">
              <span>{t('invoices.total')}</span>
              <span className="tabular-nums text-primary">{formatMoney(subtotal + tax)}</span>
            </div>
            <div className="grid gap-2 pt-2">
              <Button type="button" variant="primary" disabled={pending} onClick={() => void send(true)}>
                {pending ? <Loader2 className="animate-spin" /> : <Send />}
                {t('invoices.saveAndSend')}
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => void send(false)}>
                <Save />
                {t('invoices.saveDraft')}
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => router.push(cancelHref)}>
                {t('common.cancel')}
              </Button>
            </div>
            <p className="text-xs text-muted">{t('invoices.form.hint')}</p>
          </CardBody>
        </Card>
      </aside>
    </form>
  );
}
