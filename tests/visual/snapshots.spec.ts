import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';
import { unlockStorefront } from '../e2e/_fixtures/auth';
import { firstProductUrl } from '../e2e/_fixtures/storefront';

const widths = [375, 768, 1280, 1600];

test.describe('Visual regression — key surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await unlockStorefront(page);
  });

  test('homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await percySnapshot(page, 'home', { widths });
  });

  test('collection — all', async ({ page }) => {
    await page.goto('/collections/all', { waitUntil: 'networkidle' });
    await percySnapshot(page, 'collection-all', { widths });
  });

  test('product detail', async ({ page }) => {
    const url = await firstProductUrl(page);
    await page.goto(url, { waitUntil: 'networkidle' });
    await percySnapshot(page, 'pdp-first-product', { widths });
  });

  test('cart page (empty)', async ({ page }) => {
    await page.goto('/cart', { waitUntil: 'networkidle' });
    await percySnapshot(page, 'cart-empty', { widths });
  });

  test('quiz page', async ({ page }) => {
    const response = await page.goto('/pages/quiz', { waitUntil: 'networkidle' });
    if (!response || response.status() === 404) test.skip(true, 'Quiz page not published.');
    await percySnapshot(page, 'quiz-stage-1', { widths });
  });

  test('styleguide', async ({ page }) => {
    const response = await page.goto('/pages/styleguide', { waitUntil: 'networkidle' });
    if (!response || response.status() === 404) test.skip(true, 'Styleguide page not published.');
    await percySnapshot(page, 'styleguide', { widths });
  });
});
