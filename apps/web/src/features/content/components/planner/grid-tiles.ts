import { formatDate } from '@/shared/lib/format';
import type { Post } from '../../data/content.repository';
import { orderForGrid } from '../../utils/grid-order';
import type { GridTile } from './phone-grid';

/** Planner-ordered tiles for the phone grid preview. */
export function toGridTiles(posts: readonly Post[]): GridTile[] {
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
    };
  });
}
