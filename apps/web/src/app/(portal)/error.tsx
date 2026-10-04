'use client';

import { RouteError } from '@/shared/ui/route-states';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} homeHref="/portal" />;
}
