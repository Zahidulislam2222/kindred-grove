import type { Page } from '@playwright/test';

export async function unlockStorefront(page: Page) {
  const password = process.env.STORE_PASSWORD;
  if (!password) return;

  const baseURL = process.env.BASE_URL;
  if (!baseURL) throw new Error('BASE_URL must be set when STORE_PASSWORD is set.');

  await page.goto(new URL('/password', baseURL).toString(), { waitUntil: 'domcontentloaded' });
  const passwordField = page.locator('input[name="password"]');
  if ((await passwordField.count()) === 0) return;

  await passwordField.fill(password);
  await page.getByRole('button', { name: /enter|submit|unlock/i }).first().click();
  await page.waitForLoadState('domcontentloaded');
}
