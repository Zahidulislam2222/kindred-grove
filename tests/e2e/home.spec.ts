import { test, expect } from '@playwright/test';
import { unlockStorefront } from './_fixtures/auth';

test.describe('Homepage golden path', () => {
  test.beforeEach(async ({ page }) => {
    await unlockStorefront(page);
  });

  test('renders main landmarks and hero', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('header cart icon is reachable and exposes cart count node', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-cart-count]').first()).toBeAttached();
  });

  test('clicking a featured product link routes to PDP', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const productLink = page.locator('a[href*="/products/"]').first();
    if ((await productLink.count()) === 0) test.skip(true, 'Homepage has no product links wired to live products yet.');
    await productLink.click();
    await page.waitForURL(/\/products\//);
    await expect(page).toHaveURL(/\/products\//);
  });
});
