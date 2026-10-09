import { RouteNotFound } from '@/shared/ui/route-states';

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <RouteNotFound />
    </main>
  );
}
