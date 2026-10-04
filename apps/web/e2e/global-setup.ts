import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001/api';
const AUTH_DIR = path.join(__dirname, '.auth');
const CREDS_PATH = path.join(AUTH_DIR, 'credentials.json');

async function waitForApi(maxMs = 120_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`API not ready at ${API_BASE}/health`);
}

export default async function globalSetup(): Promise<void> {
  await waitForApi();

  const slug = `e2e-${Date.now()}`;
  const email = `e2e-${Date.now()}@test.agency`;
  const password = 'SecurePass123!@#';

  const register = await fetch(`${API_BASE}/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName: 'E2E',
      lastName: 'Owner',
      organizationName: 'E2E Agency',
      organizationSlug: slug,
    }),
  });

  if (!register.ok) {
    const body = await register.text();
    throw new Error(`Register failed (${register.status}): ${body}`);
  }

  const auth = (await register.json()) as { accessToken: string; organization?: { id: string }; organizationId?: string };
  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(
    CREDS_PATH,
    JSON.stringify({
      email,
      password,
      organizationId: auth.organization?.id ?? auth.organizationId ?? '',
      accessToken: auth.accessToken,
    }),
    'utf8',
  );
}
