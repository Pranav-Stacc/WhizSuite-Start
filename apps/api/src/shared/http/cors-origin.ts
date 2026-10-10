/**
 * CORS allow-list with optional wildcard hosts.
 * Supports exact origins and single-label patterns like `https://*.whizsuite.com`.
 */
export function createCorsOriginChecker(
  raw: string,
): (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
) => void {
  const entries = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const exact = new Set(entries.filter((o) => !o.includes('*')));
  const patterns = entries
    .filter((o) => o.includes('*'))
    .map((pattern) => {
      const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^.]+');
      return new RegExp(`^${escaped}$`, 'i');
    });

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (exact.has(origin)) {
      callback(null, true);
      return;
    }
    if (patterns.some((re) => re.test(origin))) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}
