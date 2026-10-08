import { test, expect } from '@playwright/test';
import { prepareStorefront, navigateStorefront } from './_fixtures/storefront';

test.describe('Homepage golden path', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
  });

  test('renders main landmarks and hero', async ({ page }) => {
    await navigateStorefront(page, '/');

    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('header cart link opens the drawer and Escape restores focus', async ({ page }) => {
    await navigateStorefront(page, '/');
    const cartLink = page.locator('a[data-kg-cart-open], a[href$="/cart"]').first();
    await expect(cartLink).toBeVisible();
    await cartLink.click();
    const drawer = page.locator('.kg-cart__drawer');
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(cartLink).toBeFocused();
  });

  test('clicking a featured product link routes to PDP', async ({ page }) => {
    await navigateStorefront(page, '/');
    const productLink = page.locator('a[href*="/products/"]').first();
    await expect(productLink, 'homepage must link to an available product').toBeVisible();
    await productLink.click();
    await page.waitForURL(/\/products\//);
    await expect(page).toHaveURL(/\/products\//);
  });
});
