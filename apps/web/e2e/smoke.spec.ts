import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

interface Creds {
  email: string;
  password: string;
}

async function loadCreds(): Promise<Creds> {
  const raw = await readFile(path.join(__dirname, '.auth', 'credentials.json'), 'utf8');
  const parsed = JSON.parse(raw) as Creds;
  return parsed;
}

async function login(page: import('@playwright/test').Page, creds: Creds): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|portal)/);
}

test.describe('Agency OS live smoke', () => {
  test('login and portal-access keep product Noir auth chrome', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-marketing="mono"][data-theme-lock="product"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.goto('/portal-access');
    await expect(page.locator('[data-marketing="mono"][data-theme-lock="product"]')).toBeVisible();
  });

  test('owner can sign in and reach core pages', async ({ page }) => {
    const creds = await loadCreds();
    await login(page, creds);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/clients');
    await expect(page).toHaveURL(/\/clients/);

    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/tasks/);

    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByRole('heading', { name: /calendar/i }).first()).toBeVisible();

    await page.goto('/team');
    await expect(page).toHaveURL(/\/team/);

    await page.goto('/billing');
    await expect(page).toHaveURL(/\/billing/);
  });

  test('mobile shell exposes navigation controls', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');
    const creds = await loadCreds();
    await login(page, creds);

    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
