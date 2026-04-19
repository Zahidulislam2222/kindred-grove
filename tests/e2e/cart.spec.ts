import { test, expect } from '@playwright/test';
import { unlockStorefront } from './_fixtures/auth';
import { firstProductUrl } from './_fixtures/storefront';

test.describe('Cart drawer + cart page golden path', () => {
  test.beforeEach(async ({ page }) => {
    await unlockStorefront(page);
  });

  test('drawer opens after add-to-cart and renders the line item', async ({ page }) => {
    const url = await firstProductUrl(page);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /add to cart|add to bag/i }).first().click();

    const drawer = page.locator('kg-cart-drawer');
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    await expect(drawer.locator('a[href*="/products/"]').first()).toBeVisible();
  });

  test('cart page hydrates with the previously-added item', async ({ page, context }) => {
    const url = await firstProductUrl(page);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /add to cart|add to bag/i }).first().click();
    await expect(page.locator('kg-cart-drawer')).toBeVisible({ timeout: 10_000 });

    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('a[href*="/products/"]').first()).toBeVisible();

    const checkoutTrigger = page.locator('[name="checkout"], a[href*="/checkout"]').first();
    await expect(checkoutTrigger).toBeAttached();

    void context;
  });

  test('gift-note input writes through to /cart.js attributes', async ({ page, request }) => {
    const url = await firstProductUrl(page);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /add to cart|add to bag/i }).first().click();
    await expect(page.locator('kg-cart-drawer')).toBeVisible({ timeout: 10_000 });

    const note = page.locator('kg-cart-drawer textarea, kg-cart-drawer [data-gift-note], textarea[name*="note"], textarea[name*="gift"]').first();
    if ((await note.count()) === 0) test.skip(true, 'No gift-note input on this build.');

    const message = `e2e-${Date.now()}`;
    await note.fill(message);
    await note.blur();

    await expect.poll(
      async () => {
        const res = await request.get('/cart.js');
        const body = await res.json();
        const attrs: Record<string, string> = body.attributes || {};
        return Object.values(attrs).join(' ') + ' ' + (body.note || '');
      },
      { timeout: 10_000 },
    ).toContain(message);
  });
});
