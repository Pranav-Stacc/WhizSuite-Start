import { RouteNotFound } from '@/shared/ui/route-states';
import { t } from '@/shared/i18n/t';

export default function PortalNotFound() {
  return <RouteNotFound homeHref="/portal" homeLabel={t('common.notFound.portalHome')} />;
}
