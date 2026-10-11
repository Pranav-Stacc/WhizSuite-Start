import { expect, test } from '@playwright/test';
import { emptyStorageState, ensureOwnerSession } from './helpers';

test.describe('Agency OS live smoke', () => {
  test.describe('public auth chrome', () => {
    test.use({ storageState: emptyStorageState });

    test('login and portal-access keep product Noir auth chrome', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-marketing="mono"][data-theme-lock="product"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.goto('/portal-access');
    await expect(page.locator('[data-marketing="mono"][data-theme-lock="product"]')).toBeVisible();
    });
  });

  test('owner can sign in and reach core pages', async ({ page }) => {
    await ensureOwnerSession(page);

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
    await ensureOwnerSession(page);

    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
