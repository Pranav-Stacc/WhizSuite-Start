import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const ownerStorageState = path.join(__dirname, 'e2e/.auth/owner.json');

const apiHost = process.env.API_HOST ?? '127.0.0.1';
const webHost = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const apiPort = process.env.API_PORT ?? '3001';
const apiBase = process.env.API_BASE_URL ?? `http://${apiHost}:${apiPort}/api`;
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? '3000';
const webBase = process.env.PLAYWRIGHT_BASE_URL ?? `http://${webHost}:${webPort}`;

/** Match apps/api/test/global-setup.mjs — avoid legacy Windows Redis 3 on :6379 for BullMQ. */
function resolveRedisUrl(): string {
  const fromEnv = process.env.REDIS_URL;
  if (fromEnv && !fromEnv.includes(':6379')) return fromEnv;
  return 'redis://127.0.0.1:6380';
}

const apiServerEnv = {
  ...process.env,
  PORT: apiPort,
  WEB_APP_URL: webBase,
  REDIS_URL: resolveRedisUrl(),
  OUTBOX_RELAY_ENABLED: 'false',
};

const webEnv = {
  APP_DATA_MODE: 'live',
  API_BASE_URL: apiBase,
  SESSION_COOKIE_SECURE: 'false',
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'dev-only-session-secret-change-me',
  NEXT_PUBLIC_APP_NAME: 'WhizSuite',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: webBase,
    trace: 'on-first-retry',
  },
  globalSetup: './e2e/global-setup.ts',
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], storageState: ownerStorageState },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @agency-os/api dev',
      url: `${apiBase}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      cwd: '../..',
      env: apiServerEnv,
    },
    {
      command: `pnpm dev --port ${webPort}`,
      url: webBase,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: webEnv,
    },
  ],
});
