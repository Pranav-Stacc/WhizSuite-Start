import { formatDate } from '@/shared/lib/format';
import type { Post } from '../../data/content.repository';
import { orderForGrid } from '../../utils/grid-order';
import type { GridWorkspaceTile } from './grid-workspace';

/** Planner-ordered tiles for the phone grid preview (includes platforms for filtering). */
export function toGridTiles(posts: readonly Post[]): GridWorkspaceTile[] {
  return orderForGrid(posts).map((p) => {
    const [cover] = p.media;
    return {
      id: p.id,
      title: p.title,
      contentType: p.contentType,
      status: p.status,
      dateLabel: p.scheduledAt ? formatDate(p.scheduledAt) : undefined,
      cover: cover ? { url: cover.url, mimeType: cover.mimeType } : undefined,
      slideCount: p.media.length,
      platforms: p.platforms,
    };
  });
}
