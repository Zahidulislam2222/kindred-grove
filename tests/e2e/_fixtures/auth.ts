import type { Page } from '@playwright/test';

/**
 * Primes the preview-theme cookie and clears the storefront password gate.
 *
 * Visits PREVIEW_URL (which carries ?preview_theme_id=… so Shopify sets the
 * preview cookie) and, if that lands on /password, submits STORE_PASSWORD.
 * Subsequent page.goto('/foo') calls then use the preview cookie and serve
 * the pushed theme on bare paths.
 */
export async function unlockStorefront(page: Page) {
  const previewUrl = process.env.PREVIEW_URL;
  const baseURL = process.env.BASE_URL;
  const password = process.env.STORE_PASSWORD;

  const entryUrl = previewUrl || baseURL;
  if (!entryUrl) throw new Error('PREVIEW_URL or BASE_URL must be set.');

  await page.goto(entryUrl, { waitUntil: 'domcontentloaded' });

  const passwordField = page.locator('input[name="password"]');
  if (password && (await passwordField.count()) > 0) {
    await passwordField.fill(password);
    await page.getByRole('button', { name: /enter|submit|unlock/i }).first().click();
    await page.waitForLoadState('domcontentloaded');
  }
}
