import { test, expect } from '@playwright/test';
import { addToCartAndVerify, firstProductUrl, getCartCount, navigateStorefront, prepareStorefront } from './_fixtures/storefront';

test.describe('Product detail page (PDP) golden path', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
  });

  test('renders the product gallery and add-to-cart control', async ({ page }) => {
    const url = await firstProductUrl(page);
    await navigateStorefront(page, url);

    await expect(page.locator('kg-gallery, [data-product-gallery], main img').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /add to cart|add to bag/i }).first()).toBeVisible();
  });

  test('product layout reflows within 320, 390, and 1440 CSS-pixel viewports', async ({ page }) => {
    const url = await firstProductUrl(page);
    await navigateStorefront(page, url);

    for (const width of [320, 370, 371, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => {
        const gallery = document.querySelector('.kg-product__gallery');
        const purchase = document.querySelector('.kg-product__purchase');
        const bounds = (element: Element | null) => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        };
        return {
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          gallery: bounds(gallery),
          purchase: bounds(purchase),
          atcFlexWrap: getComputedStyle(document.querySelector('.kg-atc') as Element).flexWrap,
          demoLabels: [...document.querySelectorAll('.kg-atc > .kg-demo-price-label')].map(bounds),
        };
      });

      expect(layout.documentWidth, `document width at ${width}px`).toBeLessThanOrEqual(width);
      expect(layout.gallery, `gallery present at ${width}px`).not.toBeNull();
      expect(layout.purchase, `purchase panel present at ${width}px`).not.toBeNull();
      expect(layout.atcFlexWrap, `demo ATC wrapping at ${width}px`).toBe(width <= 370 ? 'wrap' : 'nowrap');
      expect(layout.demoLabels.length, `demo ATC price label at ${width}px`).toBeGreaterThan(0);
      for (const label of layout.demoLabels) {
        expect(label!.left, `demo price label left edge at ${width}px`).toBeGreaterThanOrEqual(0);
        expect(label!.right, `demo price label right edge at ${width}px`).toBeLessThanOrEqual(width);
      }
      for (const [name, bounds] of [['gallery', layout.gallery], ['purchase', layout.purchase]] as const) {
        expect(bounds!.left, `${name} left edge at ${width}px`).toBeGreaterThanOrEqual(0);
        expect(bounds!.right, `${name} right edge at ${width}px`).toBeLessThanOrEqual(width);
      }
      await expect(page.locator('.kg-product__gallery')).toBeVisible();
      await expect(page.locator('.kg-product__purchase')).toBeVisible();
    }
  });

  test('add-to-cart increments cart count and dispatches cart:updated', async ({ page }) => {
    const url = await firstProductUrl(page);
    await navigateStorefront(page, url);

    await page.evaluate(() => {
      (window as Window & { __e2eCartUpdatedCount?: number }).__e2eCartUpdatedCount = 0;
      document.addEventListener('cart:updated', () => {
        const target = window as Window & { __e2eCartUpdatedCount?: number };
        target.__e2eCartUpdatedCount = (target.__e2eCartUpdatedCount || 0) + 1;
      });
    });
    const before = await getCartCount(page);
    await addToCartAndVerify(page, before);
    await expect.poll(() => page.evaluate(() => (window as Window & { __e2eCartUpdatedCount?: number }).__e2eCartUpdatedCount || 0)).toBeGreaterThan(0);
    await expect.poll(() => getCartCount(page)).toBeGreaterThan(before);
  });

  test('selecting a different variant updates URL with ?variant=', async ({ page }) => {
    const url = await firstProductUrl(page);
    await navigateStorefront(page, url);

    const variantInputs = page.locator('kg-variant-picker input[type="radio"]');
    const count = await variantInputs.count();
    if (count < 2) test.skip(true, 'Product has fewer than 2 variants; skipping variant-switch test.');

    await variantInputs.nth(1).click({ force: true });
    await page.waitForURL(/variant=\d+/);
    await expect(page).toHaveURL(/variant=\d+/);
  });
});
