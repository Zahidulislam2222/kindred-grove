import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
const { readTestConfig, assertExpectedOrigin, assertPasswordSubmissionMethod } = require('../../../scripts/config/test-config.cjs');

/**
 * Primes the preview-theme cookie and clears the storefront password gate.
 *
 * Visits PREVIEW_URL (which carries ?preview_theme_id=… so Shopify sets the
 * preview cookie) and, if that lands on /password, submits STORE_PASSWORD.
 * Subsequent page.goto('/foo') calls then use the preview cookie and serve
 * the pushed theme on bare paths.
 */
export async function unlockStorefront(page: Page) {
  const { previewUrl, baseUrl, storePassword } = readTestConfig(process.env);

  const entryUrl = previewUrl || baseUrl;

  await page.goto(entryUrl, { waitUntil: 'domcontentloaded' });

  const passwordField = page.locator('input[name="password"]');
  if ((await passwordField.count()) > 0) {
    assertExpectedOrigin(page.url(), entryUrl, 'Storefront password page');
    if (!storePassword) {
      throw new Error('Storefront password gate is active; set SHOPIFY_STORE_PASSWORD or STORE_PASSWORD.');
    }
    const passwordForm = passwordField.locator('xpath=ancestor::form[1]');
    if ((await passwordForm.count()) !== 1) {
      throw new Error('Storefront password form is missing.');
    }
    const formDetails = await passwordForm.evaluate((form: HTMLFormElement) => ({ action: form.action || window.location.href, method: form.method }));
    const formAction = formDetails.action;
    assertExpectedOrigin(formAction, entryUrl, 'Storefront password form');
    const submitter = passwordForm.locator('button[type="submit"], input[type="submit"]').first();
    if ((await submitter.count()) === 0) {
      throw new Error('Storefront password submit button is missing.');
    }
    const submitterDetails = await submitter.evaluate((element: HTMLButtonElement | HTMLInputElement) => ({
      action: element.formAction || element.form?.action || window.location.href,
      method: element.formMethod || element.form?.method || '',
    }));
    const submitterAction = submitterDetails.action;
    assertExpectedOrigin(submitterAction, entryUrl, 'Storefront password submitter');
    assertPasswordSubmissionMethod(formDetails.method, submitterDetails.method);
    await passwordField.fill(storePassword);
    await submitter.click();
    await expect(passwordField).toHaveCount(0);
  }
}
