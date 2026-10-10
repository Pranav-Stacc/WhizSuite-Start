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
import { Sheet } from '@/shared/ui/overlays';
import { PLATFORM_META, PlatformBadge } from '@/shared/ui/platform';
import { createContentAction, deleteContentAction, updateContentAction } from '../actions/content.actions';
import { ComposerUpload } from './composer-upload';
import { SlidePicker, type ComposerAsset, type ComposerSlide } from './slide-picker';

export type { ComposerAsset, ComposerSlide } from './slide-picker';

export interface ComposerClient {
  id: string;
  name: string;
  color: string;
  platforms: Platform[];
  hashtags: string[];
  pillars: string[];
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
  hashtags: string[];
  ctaUrl: string;
  pillar: string;
  slides: ComposerSlide[];
  /** Saving voids the current approval and sends the post back to draft. */
  resetsApproval: boolean;
}

interface ContentFormValues {
  title: string;
  clientId: string;
  contentType: ContentType;
  caption: string;
  hashtags: string;
  ctaUrl: string;
  pillar: string;
  platforms: Platform[];
  mediaAssetIds: string[];
  scheduledAt: string;
  submitForApproval: boolean;
}

interface ContentComposerProps {
  clients: ComposerClient[];
  /** Library assets available as slides (filtered to the selected client in the picker). */
  assets?: ComposerAsset[];
  post?: ComposerPost;
  trigger?: ReactNode;
  defaultOpen?: boolean;
  defaultClientId?: string;
  /** Pre-fills the publish date for new posts (datetime-local value). */
  defaultScheduledAt?: string;
  /** Pre-selects slides for new posts. */
  defaultAssetIds?: string[];
  /** Controlled mode, used by planners that open the drawer from a tile. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Keep the user on the current view after saving instead of opening the post page. */
  stayOnSave?: boolean;
  /** Live storage must be available for direct uploads from the composer. */
  uploadEnabled?: boolean;
}

const DATE_TIME_SEPARATOR = 'T';
const HASHTAG_JOINER = ' ';
const DEFAULT_TIME = '10:00';

function splitDateTime(value: string): [date: string, time: string] {
  const [date = '', time = ''] = value.split(DATE_TIME_SEPARATOR);
  return [date, time];
}

export function ContentComposer({
  clients,
  assets = [],
  post,
  trigger,
  defaultOpen = false,
  defaultClientId,
  defaultScheduledAt,
  defaultAssetIds = [],
  open: controlledOpen,
  onOpenChange,
  stayOnSave = false,
  uploadEnabled = true,
}: ContentComposerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const initialClient = clients.find((c) => c.id === (post?.clientId ?? defaultClientId)) ?? clients[0];
  const defaults: ContentFormValues = {
    title: post?.title ?? '',
    clientId: initialClient?.id ?? '',
    contentType: post?.contentType ?? 'POST',
    caption: post?.caption ?? '',
    hashtags: post?.hashtags.join(HASHTAG_JOINER) ?? '',
    ctaUrl: post?.ctaUrl ?? '',
    pillar: post?.pillar ?? '',
    platforms: post?.platforms ?? initialClient?.platforms.slice(0, 1) ?? [],
    mediaAssetIds: post?.slides.map((s) => s.assetId) ?? defaultAssetIds,
    scheduledAt: post?.scheduledAt ?? defaultScheduledAt ?? '',
    submitForApproval: false,
  };

  const form = useForm<ContentFormValues>({ resolver: zodResolver(createContentSchema) as unknown as Resolver<ContentFormValues>, defaultValues: defaults });
  const [clientId, platforms, caption, hashtags] = useWatch({ control: form.control, name: ['clientId', 'platforms', 'caption', 'hashtags'] });
  const client = clients.find((c) => c.id === clientId);
  const tightestLimit = platforms.length ? Math.min(...platforms.map((p) => PLATFORM_META[p].limit)) : undefined;
  const clientAssets = assets.filter((a) => a.clientId === clientId);
  const knownSlides = [...(post?.slides ?? []), ...clientAssets];

  useEffect(() => {
    if (defaultOpen) setInternalOpen(true);
  }, [defaultOpen]);

  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (next) return;
    setConfirmDelete(false);
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
          if (!stayOnSave && result.data?.href) router.push(result.data.href);
          return;
        }
        for (const [name, message] of Object.entries(result.fieldErrors ?? {})) form.setError(name as keyof ContentFormValues, { message });
        toast.error(result.message);
      });
    });

  const remove = () => {
    if (!post) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteContentAction(post.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      close(false);
      if (pathname.startsWith(`/content/${post.id}`)) router.push('/content');
      else router.refresh();
    });
  };

  const errors = form.formState.errors;
  const addHashtag = (tag: string) => {
    const current = form.getValues('hashtags');
    if (!current.split(/\s+/).includes(tag)) form.setValue('hashtags', `${current}${current && !current.endsWith(HASHTAG_JOINER) ? HASHTAG_JOINER : ''}${tag}`, { shouldDirty: true });
  };

  return (
    <>
      {trigger ? (
        <span className="contents" onClick={() => setOpen(true)}>
          {trigger}
        </span>
      ) : null}
      <Sheet
        open={open}
        onOpenChange={close}
        width="max-w-2xl"
        title={post ? t('content.composer.edit') : t('content.composer.title')}
        description={post?.resetsApproval ? t('content.composer.edit.desc') : t('content.composer.desc')}
        footer={
          <>
            {post ? (
              <Button variant={confirmDelete ? 'danger' : 'ghost'} size="sm" type="button" disabled={pending} onClick={remove}>
                {confirmDelete ? t('content.composer.deleteConfirm') : t('common.delete')}
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button variant="ghost" size="sm" type="button" onClick={() => close(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="outline" size="sm" type="button" disabled={pending} onClick={submit(false)}>
              {post ? t('common.save') : t('content.composer.saveDraft')}
            </Button>
            <Button variant="primary" size="sm" type="button" disabled={pending} onClick={submit(true)}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {t('content.composer.submit')}
            </Button>
          </>
        }
      >
        <form noValidate onSubmit={(e) => e.preventDefault()} className="grid gap-6">
          <Controller
            control={form.control}
            name="mediaAssetIds"
            render={({ field }) => (
              <div className="space-y-3">
                <SlidePicker value={field.value} onChange={field.onChange} known={knownSlides} library={clientAssets} />
                <ComposerUpload
                  clientId={clientId}
                  enabled={uploadEnabled}
                  onUploaded={(ids) => field.onChange([...field.value, ...ids.filter((id) => !field.value.includes(id))])}
                />
              </div>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
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
                    form.setValue('mediaAssetIds', []);
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

            <Controller
              control={form.control}
              name="scheduledAt"
              render={({ field }) => {
                const [date, time] = splitDateTime(field.value);
                const update = (nextDate: string, nextTime: string) => field.onChange(nextDate ? `${nextDate}${DATE_TIME_SEPARATOR}${nextTime || DEFAULT_TIME}` : '');
                return (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_7rem]">
                    <Field label={t('content.field.date')} htmlFor="cc-date">
                      <Input id="cc-date" type="date" value={date} onChange={(e) => update(e.target.value, time)} />
                    </Field>
                    <Field label={t('content.field.time')} htmlFor="cc-time">
                      <Input id="cc-time" type="time" value={time} disabled={!date} onChange={(e) => update(date, e.target.value)} />
                    </Field>
                  </div>
                );
              }}
            />
          </div>

          <Field label={t('content.field.type')}>
            <Controller
              control={form.control}
              name="contentType"
              render={({ field }) => (
                <div role="radiogroup" aria-label={t('content.field.type')} className="grid grid-cols-3 border border-border sm:grid-cols-6">
                  {ContentTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={field.value === type}
                      onClick={() => field.onChange(type)}
                      className={cn(
                        'h-9 border-border text-[10.5px] uppercase tracking-[0.14em] transition-colors [&:not(:last-child)]:border-r',
                        field.value === type ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
                      )}
                    >
                      {t(`type.content.${type}`)}
                    </button>
                  ))}
                </div>
              )}
            />
          </Field>

          <Field label={t('content.field.platforms')} required error={translateError(errors.platforms?.message as string | undefined)}>
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
                          'inline-flex h-8 items-center gap-2 rounded-sm border px-2.5 text-[12px] transition-colors',
                          active ? 'border-foreground text-foreground' : 'border-border text-muted hover:border-border-strong',
                        )}
                      >
                        <PlatformBadge platform={p} size="xs" />
                        {PLATFORM_META[p].label}
                        {!connected ? <span className="text-[9.5px] uppercase tracking-[0.12em] text-warning">{t('content.field.platforms.notConnected')}</span> : null}
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
          >
            <Textarea id="cc-caption" rows={7} placeholder={t('content.field.caption.placeholder')} {...form.register('caption')} />
            {tightestLimit ? (
              <p className={cn('mt-1.5 text-right text-[11px] tabular-nums', caption.length + hashtags.length > tightestLimit ? 'text-danger' : 'text-muted')} aria-live="polite">
                {t('content.field.caption.count', { count: caption.length + hashtags.length, limit: tightestLimit })}
              </p>
            ) : null}
          </Field>

          <Field label={t('content.field.hashtags')} htmlFor="cc-hashtags" error={translateError(errors.hashtags?.message)}>
            <Input id="cc-hashtags" placeholder={t('content.field.hashtags.placeholder')} {...form.register('hashtags')} />
            {client?.hashtags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {client.hashtags.map((tag) => (
                  <button key={tag} type="button" onClick={() => addHashtag(tag)} className="border border-border px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-foreground hover:text-foreground">
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('content.field.cta')} htmlFor="cc-cta" error={translateError(errors.ctaUrl?.message)}>
              <Input id="cc-cta" type="url" inputMode="url" placeholder={t('content.field.cta.placeholder')} {...form.register('ctaUrl')} />
            </Field>
            <Field label={t('content.field.pillar')} htmlFor="cc-pillar" error={translateError(errors.pillar?.message)}>
              <Input id="cc-pillar" list="cc-pillars" placeholder={t('content.field.pillar.placeholder')} {...form.register('pillar')} />
              <datalist id="cc-pillars">
                {client?.pillars.map((p) => <option key={p} value={p} />)}
              </datalist>
            </Field>
          </div>
        </form>
      </Sheet>
    </>
  );
}
