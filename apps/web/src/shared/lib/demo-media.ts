/** Placeholder imagery for demo mode only; live mode always uses signed storage URLs. */
const DEMO_IMAGE_BASE_URL = 'https://picsum.photos/seed';
const DEMO_IMAGE_WIDTH = 800;
const DEMO_IMAGE_HEIGHT = 1000;

export function demoImageUrl(seed: string): string {
  return `${DEMO_IMAGE_BASE_URL}/${encodeURIComponent(seed)}/${DEMO_IMAGE_WIDTH}/${DEMO_IMAGE_HEIGHT}`;
}
