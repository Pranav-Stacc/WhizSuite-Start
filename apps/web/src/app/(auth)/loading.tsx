import { Skeleton } from '@/shared/ui/feedback';

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-11 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
    </div>
  );
}
