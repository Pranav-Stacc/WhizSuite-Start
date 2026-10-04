const WILDCARD_SUFFIX = '/*';

/** Matches exact types (`application/pdf`) and family wildcards (`image/*`). */
export function isMimeTypeAllowed(mimeType: string, allowed: readonly string[]): boolean {
  const normalized = mimeType.toLowerCase();
  return allowed.some((rule) =>
    rule.endsWith(WILDCARD_SUFFIX)
      ? normalized.startsWith(rule.slice(0, -1))
      : normalized === rule,
  );
}
