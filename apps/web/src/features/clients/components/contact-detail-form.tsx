'use client';

import { useState, useTransition } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import {
  deleteClientContactAction,
  updateClientContactAction,
} from '../actions/client-contact.actions';
import type { ClientContactView } from './client-contacts-panel';

export function ContactDetailForm({
  clientId,
  contact,
}: {
  clientId: string;
  contact: ClientContactView;
}) {
  const [firstName, setFirstName] = useState(contact.firstName);
  const [lastName, setLastName] = useState(contact.lastName ?? '');
  const [email, setEmail] = useState(contact.email ?? '');
  const [role, setRole] = useState(contact.role ?? '');
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await updateClientContactAction(contact.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        role: role.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteClientContactAction(contact.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      window.location.href = `/clients/${clientId}/contacts`;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('clients.contacts.firstName')} htmlFor={`contact-fn-${contact.id}`} required>
          <Input
            id={`contact-fn-${contact.id}`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label={t('clients.contacts.lastName')} htmlFor={`contact-ln-${contact.id}`}>
          <Input
            id={`contact-ln-${contact.id}`}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label={t('clients.field.contactEmail')} htmlFor={`contact-em-${contact.id}`}>
          <Input
            id={`contact-em-${contact.id}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label={t('clients.contacts.role')} htmlFor={`contact-role-${contact.id}`}>
          <Input
            id={`contact-role-${contact.id}`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={pending}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" disabled={pending || firstName.trim().length < 1} onClick={save}>
          {pending ? <Loader2 className="animate-spin" /> : <Save className="size-4" />}
          {t('common.save')}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={remove}>
          <Trash2 className="size-4 text-danger" />
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}
