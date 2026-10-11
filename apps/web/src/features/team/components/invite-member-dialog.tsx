'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { AccessRoleSummary } from '@agency-os/contracts';
import { inviteMemberSchema } from '@agency-os/contracts';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import { inviteMemberAction } from '../actions/member.actions';

interface InviteMemberDialogProps {
  assignableRoles: AccessRoleSummary[];
  trigger?: ReactNode;
  defaultOpen?: boolean;
}

export function InviteMemberDialog({ assignableRoles, trigger, defaultOpen = false }: InviteMemberDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(defaultOpen);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const reset = () => {
    setStep(1);
    setEmail('');
    setNote('');
    setSelected(new Set());
    setFieldErrors({});
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      reset();
      if (defaultOpen) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('new');
        params.delete('invite');
        router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
      }
    }
  };

  const toggleRole = (roleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const submit = () => {
    const parsed = inviteMemberSchema.safeParse({
      email,
      note,
      membershipType: 'MEMBER',
      roleIds: [...selected],
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string') errors[key] = issue.message;
      }
      setFieldErrors(errors);
      if (errors.email) setStep(1);
      return;
    }
    setFieldErrors({});
    startTransition(async () => {
      const result = await inviteMemberAction(parsed.data);
      if (result.ok) {
        const shareLink = result.data?.shareLink;
        toast.success(
          result.message ?? t('team.invited', { email: parsed.data.email }),
          shareLink
            ? {
                duration: 20_000,
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
        return;
      }
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.message);
    });
  };

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
        title={step === 1 ? t('team.invite.heading') : t('team.invite.step.roles')}
        description={step === 1 ? t('team.invite.desc') : t('team.invite.step.roles.desc')}
        size="md"
        footer={
          <>
            {step === 2 ? (
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={pending}>
                {t('common.back')}
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => close(false)} disabled={pending}>
                {t('common.cancel')}
              </Button>
            )}
            {step === 1 ? (
              <Button
                type="button"
                variant="primary"
                disabled={!email.trim()}
                onClick={() => {
                  if (!email.trim()) return;
                  setStep(2);
                }}
              >
                {t('common.next')}
              </Button>
            ) : (
              <Button type="button" variant="primary" disabled={pending || selected.size === 0} onClick={submit}>
                {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
                {t('team.invite.send')}
              </Button>
            )}
          </>
        }
      >
        {step === 1 ? (
          <div className="space-y-4">
            <Field label={t('team.invite.email')} htmlFor="invite-email" required error={translateError(fieldErrors.email)}>
              <Input
                id="invite-email"
                type="email"
                autoFocus
                placeholder={t('team.invite.email.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
            </Field>
            <Field label={t('team.invite.title')} htmlFor="invite-note" hint={t('team.invite.title.placeholder')}>
              <Textarea id="invite-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
              {t('team.invite.step.roles.for', { email })}
            </p>
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{t('team.roles.field')}</p>
                <Link href="/roles?new=1" className="text-xs font-medium text-primary hover:underline">
                  <Plus className="mr-1 inline size-3.5" />
                  {t('team.invite.createRole')}
                </Link>
              </div>
              <ul className="max-h-[40vh] space-y-1 overflow-y-auto rounded-xl border border-border-soft p-2">
                {assignableRoles.map((role) => (
                  <li key={role.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2',
                        selected.has(role.id) && 'bg-primary/10',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="size-3.5 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {role.name}
                          {role.isSystem ? ` · ${t('roles.system')}` : ''}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {role.defaultScopeTypes.map((scope) => humanizeKey(scope)).join(', ')}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted">{t('team.roles.hint')}</p>
              {fieldErrors.roleIds ? (
                <p className="mt-1 text-xs text-danger" role="alert">{translateError(fieldErrors.roleIds)}</p>
              ) : null}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
