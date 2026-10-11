import { t } from '@/shared/i18n/t';

export default function ChatLoading() {
  return (
    <div className="space-y-6">
      <div className="flex animate-pulse items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded-lg bg-muted" />
          <div className="h-4 w-64 max-w-full rounded bg-muted/70" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>
      <div
        className="grid min-h-[min(70vh,36rem)] animate-pulse overflow-hidden rounded-2xl border border-border-soft bg-surface lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]"
        aria-busy="true"
        aria-label={t('chat.title')}
      >
        <div className="space-y-2 border-b border-border-soft p-4 lg:border-b-0 lg:border-r">
          <div className="h-4 w-24 rounded bg-muted" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 border-b border-border-soft py-3">
              <div className="h-3 w-16 rounded bg-muted/60" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted/50" />
            </div>
          ))}
        </div>
        <div className="flex flex-col p-4">
          <div className="mb-4 flex gap-3">
            <div className="size-9 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted/60" />
            </div>
          </div>
          <div className="mt-auto space-y-3">
            <div className="h-16 rounded-xl bg-muted/50" />
            <div className="h-11 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
