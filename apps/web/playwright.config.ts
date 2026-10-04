import { defineConfig, devices } from '@playwright/test';

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001/api';
const webEnv = {
  APP_DATA_MODE: 'live',
  API_BASE_URL: apiBase,
  SESSION_COOKIE_SECURE: 'false',
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'dev-only-session-secret-change-me',
  NEXT_PUBLIC_APP_NAME: 'Agency OS',
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
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  globalSetup: './e2e/global-setup.ts',
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @agency-os/api dev',
      url: `${apiBase}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      cwd: '../..',
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: webEnv,
    },
  ],
});
