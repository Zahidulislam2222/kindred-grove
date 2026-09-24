import { test, expect } from '@playwright/test';
import { addToCartAndVerify, configuredTestCountry, firstProductUrl, getCartCount, navigateStorefront, prepareStorefront } from './_fixtures/storefront';

test.describe('Cart drawer + cart page golden path', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
  });

  test('drawer opens after add-to-cart and renders the line item', async ({ page }) => {
    const url = await firstProductUrl(page);
    await navigateStorefront(page, url);

    const before = await getCartCount(page);
    await addToCartAndVerify(page, before);

    const drawer = page.locator('kg-cart-drawer');
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    await expect(drawer.locator('a[href*="/products/"]').first()).toBeVisible();
  });

  test('cart page hydrates with the previously-added item', async ({ page }) => {
    const url = await firstProductUrl(page);
    await navigateStorefront(page, url);
    const before = await getCartCount(page);
    await addToCartAndVerify(page, before);
    await expect(page.locator('kg-cart-drawer')).toBeVisible({ timeout: 10_000 });

    await navigateStorefront(page, '/cart');
    await expect(page.locator('a[href*="/products/"]').first()).toBeVisible();

    if (await page.locator('body').getAttribute('data-demo-mode') === 'true') {
      const pageCheckout = page.locator('.kg-cart-page [data-demo-checkout]');
      await expect(pageCheckout).toHaveCount(1);
      await expect(pageCheckout).toBeVisible();
      for (const control of await page.locator('[data-demo-checkout]').all()) {
        await expect(control).toBeDisabled();
      }
    } else {
      await expect(page.locator('[name="checkout"], a[href*="/checkout"]').first()).toBeAttached();
    }
  });

  test('cart drawer add, quantity, and remove controls move exact item count 0 to 1 to 2 to 0', async ({ page }, testInfo) => {
    const initialCount = await getCartCount(page);
    expect(initialCount, 'a fresh test browser context must start with an empty cart').toBe(0);
    const url = await firstProductUrl(page);
    await navigateStorefront(page, url);
    await addToCartAndVerify(page, initialCount);

    const drawer = page.locator('kg-cart-drawer');
    await expect(drawer).toBeVisible();
    await expect.poll(() => getCartCount(page)).toBe(1);
    // Capture only the post-authentication demo cart; password artifacts stay disabled.
    if (await page.locator('body').getAttribute('data-demo-mode') === 'true') {
      await page.screenshot({ path: testInfo.outputPath('populated-demo-cart.png') });
    }
    const increment = drawer.locator('[data-kg-qty-increment]').first();
    await expect(increment).toBeEnabled();
    await increment.click();
    await expect.poll(() => getCartCount(page)).toBe(2);
    await expect(drawer.locator('[data-kg-qty-input]').first()).toHaveValue('2');

    const remove = drawer.locator('[data-kg-cart-remove]').first();
    await expect(remove).toBeEnabled();
    await remove.click();
    await expect.poll(() => getCartCount(page)).toBe(0);
    await expect(drawer.locator('[data-kg-cart-empty]')).toBeVisible();
  });

  test('gift-note controls reflect demo mode without submitting visitor text', async ({ page }) => {
    const url = await firstProductUrl(page);
    await navigateStorefront(page, url);
    const before = await getCartCount(page);
    await addToCartAndVerify(page, before);
    await expect(page.locator('kg-cart-drawer')).toBeVisible({ timeout: 10_000 });

    const demoMode = await page.locator('body').getAttribute('data-demo-mode');
    const note = page.locator('kg-cart-drawer textarea, kg-cart-drawer [data-gift-note], textarea[name*="note"], textarea[name*="gift"]');
    if (demoMode === 'true') {
      await expect(note).toHaveCount(0);
      await expect(page.locator('.kg-demo-disabled-message').first()).toBeVisible();
    } else {
      await expect(note.first()).toBeVisible();
      // Never fill or submit personal/free-text cart data in the E2E suite.
    }
  });

  test('configured country is selected through Shopify native localization', async ({ page }) => {
    const country = configuredTestCountry();
    test.skip(!country, 'TEST_COUNTRY is unset; no country context was requested.');
    await expect(page.locator('#GroveCountryForm select[name="country_code"]')).toHaveValue(country!);
  });
});
