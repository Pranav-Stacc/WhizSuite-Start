'use client';

import { useState, useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import {
  createClientContactAction,
  deleteClientContactAction,
} from '../actions/client-contact.actions';

export interface ClientContactView {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export function ClientContactsPanel({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: ClientContactView[];
}) {
  const [rows, setRows] = useState(contacts);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [pending, startTransition] = useTransition();

  const add = () => {
    startTransition(async () => {
      const result = await createClientContactAction({
        clientId,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        role: role.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const id = result.data?.id;
      if (id) {
        setRows((prev) => [
          ...prev,
          {
            id,
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
            email: email.trim() || undefined,
            role: role.trim() || undefined,
          },
        ]);
      }
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('');
      toast.success(result.message);
    });
  };

  const remove = (contactId: string) => {
    startTransition(async () => {
      const result = await deleteClientContactAction(contactId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== contactId));
      toast.success(result.message);
    });
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.length === 0 ? (
          <li className="text-sm text-muted">{t('clients.contacts.empty')}</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border-soft px-3 py-2 text-sm"
            >
              <a
                href={`/clients/${clientId}/contacts/${row.id}`}
                className="min-w-0 flex-1 hover:text-primary"
              >
                <p className="font-medium">
                  {[row.firstName, row.lastName].filter(Boolean).join(' ')}
                </p>
                {row.role ? <p className="text-muted">{row.role}</p> : null}
                {row.email ? <p className="truncate text-muted">{row.email}</p> : null}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => remove(row.id)}
                aria-label={t('common.delete')}
              >
                <Trash2 className="size-4 text-danger" />
              </Button>
            </li>
          ))
        )}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t('clients.contacts.firstName')} htmlFor={`contact-fn-${clientId}`}>
          <Input
            id={`contact-fn-${clientId}`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-8"
          />
        </Field>
        <Field label={t('clients.contacts.lastName')} htmlFor={`contact-ln-${clientId}`}>
          <Input
            id={`contact-ln-${clientId}`}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-8"
          />
        </Field>
        <Field label={t('clients.field.contactEmail')} htmlFor={`contact-em-${clientId}`}>
          <Input
            id={`contact-em-${clientId}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-8"
          />
        </Field>
        <Field label={t('clients.contacts.role')} htmlFor={`contact-role-${clientId}`}>
          <Input
            id={`contact-role-${clientId}`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-8"
          />
        </Field>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending || firstName.trim().length < 1}
        onClick={add}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Plus className="size-4" />}
        {t('clients.contacts.add')}
      </Button>
    </div>
  );
}
