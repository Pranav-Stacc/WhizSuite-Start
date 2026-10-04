'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ContentTypes, Platforms, createContentSchema, type ContentType, type Platform } from '@agency-os/contracts';
import { translateError } from '@/shared/forms/form-dialog';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { Modal } from '@/shared/ui/overlays';
import { PLATFORM_META, PlatformBadge } from '@/shared/ui/platform';
import { createContentAction, updateContentAction } from '../actions/content.actions';
import { PostPreview } from './post-preview';

export interface ComposerClient {
  id: string;
  name: string;
  color: string;
  platforms: Platform[];
  hashtags: string[];
  voice: string;
}

export interface ComposerPost {
  id: string;
  title: string;
  clientId: string;
  contentType: ContentType;
  caption: string;
  platforms: Platform[];
  /** datetime-local value */
  scheduledAt: string;
}

interface ContentFormValues {
  title: string;
  clientId: string;
  contentType: ContentType;
  caption: string;
  platforms: Platform[];
  scheduledAt: string;
  submitForApproval: boolean;
}

interface ContentComposerProps {
  clients: ComposerClient[];
  post?: ComposerPost;
  trigger?: ReactNode;
  defaultOpen?: boolean;
  defaultClientId?: string;
}

export function ContentComposer({ clients, post, trigger, defaultOpen = false, defaultClientId }: ContentComposerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();

  const initialClient = clients.find((c) => c.id === (post?.clientId ?? defaultClientId)) ?? clients[0];
  const defaults: ContentFormValues = {
    title: post?.title ?? '',
    clientId: initialClient?.id ?? '',
    contentType: post?.contentType ?? 'POST',
    caption: post?.caption ?? '',
    platforms: post?.platforms ?? initialClient?.platforms.slice(0, 1) ?? [],
    scheduledAt: post?.scheduledAt ?? '',
    submitForApproval: false,
  };

  const form = useForm<ContentFormValues>({ resolver: zodResolver(createContentSchema) as unknown as Resolver<ContentFormValues>, defaultValues: defaults });
  const [clientId, platforms, caption, title, contentType] = useWatch({ control: form.control, name: ['clientId', 'platforms', 'caption', 'title', 'contentType'] });
  const client = clients.find((c) => c.id === clientId);
  const previewPlatform = platforms[0] ?? client?.platforms[0] ?? Platforms[0];
  const tightestLimit = platforms.length ? Math.min(...platforms.map((p) => PLATFORM_META[p].limit)) : undefined;

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const close = (next: boolean) => {
    setOpen(next);
    if (next) return;
    form.reset(defaults);
    if (defaultOpen) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('new');
      params.delete('client');
      router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    }
  };

  const submit = (submitForApproval: boolean) =>
    form.handleSubmit((values) => {
      startTransition(async () => {
        const payload = { ...values, submitForApproval };
        const result = post ? await updateContentAction(post.id, payload) : await createContentAction(payload);
        if (result.ok) {
          toast.success(result.message ?? t('toast.created'));
          close(false);
          if (result.data?.href) router.push(result.data.href);
          return;
        }
        for (const [name, message] of Object.entries(result.fieldErrors ?? {})) form.setError(name as keyof ContentFormValues, { message });
        toast.error(result.message);
      });
    });

  const errors = form.formState.errors;
  const addHashtag = (tag: string) => {
    const current = form.getValues('caption');
    if (!current.includes(tag)) form.setValue('caption', `${current}${current && !current.endsWith(' ') ? ' ' : ''}${tag}`, { shouldDirty: true });
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
        size="xl"
        title={post ? t('content.composer.edit') : t('content.composer.title')}
        description={post ? t('content.composer.edit.desc') : t('content.composer.desc')}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => close(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="secondary" type="button" disabled={pending} onClick={submit(false)}>
              {post ? t('common.save') : t('content.composer.saveDraft')}
            </Button>
            <Button variant="primary" type="button" disabled={pending} onClick={submit(true)}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {t('content.composer.submit')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <form noValidate onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2">
            <Field label={t('content.field.title')} htmlFor="cc-title" required error={translateError(errors.title?.message)} className="sm:col-span-2">
              <Input id="cc-title" placeholder={t('content.field.title.placeholder')} aria-invalid={Boolean(errors.title)} {...form.register('title')} />
            </Field>

            <Field label={t('content.field.client')} htmlFor="cc-client" required error={translateError(errors.clientId?.message)}>
              <Select
                id="cc-client"
                aria-invalid={Boolean(errors.clientId)}
                {...form.register('clientId', {
                  onChange: (e) => {
                    const next = clients.find((c) => c.id === e.target.value);
                    if (next) form.setValue('platforms', next.platforms.slice(0, 1));
                  },
                })}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t('content.field.type')} htmlFor="cc-type">
              <Select id="cc-type" {...form.register('contentType')}>
                {ContentTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`type.content.${type}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t('content.field.platforms')} required error={translateError(errors.platforms?.message as string | undefined)} className="sm:col-span-2">
              <Controller
                control={form.control}
                name="platforms"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2" role="group" aria-label={t('content.field.platforms')}>
                    {Platforms.map((p) => {
                      const active = field.value.includes(p);
                      const connected = client?.platforms.includes(p) ?? false;
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={active}
                          onClick={() => field.onChange(active ? field.value.filter((v) => v !== p) : [...field.value, p])}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                            active ? 'border-primary bg-primary/12 text-primary' : 'border-border-soft bg-surface-2 text-muted hover:border-border',
                          )}
                        >
                          <PlatformBadge platform={p} size="xs" />
                          {PLATFORM_META[p].label}
                          {!connected ? <span className="text-[10px] uppercase text-warning">{t('content.field.platforms.notConnected')}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </Field>

            <Field
              label={t('content.field.caption')}
              htmlFor="cc-caption"
              error={translateError(errors.caption?.message)}
              hint={client?.voice ? t('content.field.caption.voice', { voice: client.voice }) : undefined}
              className="sm:col-span-2"
            >
              <Textarea id="cc-caption" rows={6} placeholder={t('content.field.caption.placeholder')} {...form.register('caption')} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {client?.hashtags.map((tag) => (
                  <button key={tag} type="button" onClick={() => addHashtag(tag)} className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs text-primary hover:bg-primary/20">
                    {tag}
                  </button>
                ))}
                {tightestLimit ? (
                  <span className={cn('ml-auto text-xs tabular-nums', caption.length > tightestLimit ? 'text-danger' : 'text-muted')} aria-live="polite">
                    {t('content.field.caption.count', { count: caption.length, limit: tightestLimit })}
                  </span>
                ) : null}
              </div>
            </Field>

            <Field label={t('content.field.schedule')} htmlFor="cc-schedule" hint={t('content.field.schedule.hint')} className="sm:col-span-2">
              <Input id="cc-schedule" type="datetime-local" {...form.register('scheduledAt')} />
            </Field>
          </form>

          <aside aria-label={t('content.preview.title')} className="lg:sticky lg:top-0 lg:self-start">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t('content.preview.title')}</p>
            <PostPreview
              clientName={client?.name ?? ''}
              clientColor={client?.color ?? '#18E889'}
              platform={previewPlatform}
              contentType={contentType}
              caption={caption}
              title={title}
            />
          </aside>
        </div>
      </Modal>
    </>
  );
}
