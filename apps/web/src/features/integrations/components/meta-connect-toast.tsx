'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';

/** Surfaces Meta OAuth callback result from `?meta=connected|error` once. */
export function MetaConnectToast({
  status,
}: {
  status: string | undefined;
}) {
  const router = useRouter();
  useEffect(() => {
    if (status !== 'connected' && status !== 'error') return;
    if (status === 'connected') {
      toast.success(t('integrations.meta.connectedToast'));
    } else {
      toast.error(t('integrations.meta.errorToast'));
    }
    router.replace('/integrations', { scroll: false });
  }, [status, router]);
  return null;
}
