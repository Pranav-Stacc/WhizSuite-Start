const INTRO_DISMISSED_PREFIX = 'agency-workspace-setup-intro-dismissed';
const FLOATING_DISMISSED_PREFIX = 'agency-workspace-setup-floating-dismissed';
const LEGACY_INTRO_SEEN = 'agency-workspace-setup-intro-seen';
const LEGACY_FLOATING_DISMISS = 'agency-workspace-setup-dismissed';

function introKey(orgId: string) {
  return `${INTRO_DISMISSED_PREFIX}:${orgId}`;
}

function floatingKey(orgId: string) {
  return `${FLOATING_DISMISSED_PREFIX}:${orgId}`;
}

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function write(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

/** True when the intro modal should never auto-open again for this org. */
export function isSetupIntroDismissed(orgId: string): boolean {
  return (
    read(introKey(orgId)) ||
    read(LEGACY_INTRO_SEEN) ||
    read(LEGACY_FLOATING_DISMISS) ||
    read(floatingKey(orgId))
  );
}

export function dismissSetupIntro(orgId: string) {
  write(introKey(orgId));
}

/** True when the floating checklist was explicitly dismissed. */
export function isSetupFloatingDismissed(orgId: string): boolean {
  return read(floatingKey(orgId)) || read(LEGACY_FLOATING_DISMISS);
}

export function dismissSetupFloating(orgId: string) {
  write(floatingKey(orgId));
}
