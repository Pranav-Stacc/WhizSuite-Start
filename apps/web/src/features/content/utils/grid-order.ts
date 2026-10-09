interface GridOrderable {
  gridPosition?: number;
  scheduledAt?: string;
  createdAt: string;
}

const placedAt = (p: GridOrderable): string => p.scheduledAt ?? p.createdAt;

/**
 * Instagram-style planner order (index 0 = top-left).
 * Posts never placed by hand lead, newest first, exactly where a new post would land on the feed;
 * hand-placed posts follow in their saved order.
 */
export function orderForGrid<T extends GridOrderable>(posts: readonly T[]): T[] {
  const unplaced = posts.filter((p) => p.gridPosition === undefined).sort((a, b) => placedAt(b).localeCompare(placedAt(a)));
  const placed = posts.filter((p) => p.gridPosition !== undefined).sort((a, b) => (a.gridPosition ?? 0) - (b.gridPosition ?? 0));
  return [...unplaced, ...placed];
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
