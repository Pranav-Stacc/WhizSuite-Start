import Link from 'next/link';
import { Compass } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/12 text-primary">
          <Compass className="size-7" />
        </span>
        <h1 className="text-2xl font-semibold">{t('common.notFound.title')}</h1>
        <p className="text-sm text-muted">{t('common.notFound.body')}</p>
        <Button variant="primary" asChild>
          <Link href="/dashboard">{t('common.notFound.home')}</Link>
        </Button>
      </div>
    </main>
  );
}
