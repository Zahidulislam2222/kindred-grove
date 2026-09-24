import { test, expect } from '@playwright/test';
import { unlockStorefront } from './_fixtures/auth';

test('mobile primary navigation stays visible without JavaScript at 320px and 390px', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  try {
    await unlockStorefront(page);
    const header = page.locator('grove-header');
    const nav = header.locator('.grove-nav');
    const menuToggle = header.locator('.grove-menu-toggle');

    await expect(header).toBeAttached();
    expect(await header.evaluate((element) => element.matches(':defined'))).toBe(false);
    await expect(nav.locator('a')).toHaveCount(3);

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(nav, `primary navigation should be visible without JavaScript at ${width}px`).toBeVisible();
      await expect(nav).toHaveCSS('position', 'static');
      await expect(menuToggle, `inert menu control should be hidden at ${width}px`).toBeHidden();
      await expect(nav.locator('a')).toHaveCount(3);
      for (const link of await nav.locator('a').all()) await expect(link).toBeVisible();

      const layout = await page.evaluate(() => {
        const bounds = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`Missing layout element: ${selector}`);
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        };
        return {
          brand: bounds('.grove-brand'),
          actions: bounds('.grove-header__actions'),
          nav: bounds('.grove-nav'),
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
        };
      });
      expect(Math.max(layout.brand.top, layout.actions.top), `brand and cart actions should share a row at ${width}px`).toBeLessThanOrEqual(Math.min(layout.brand.bottom, layout.actions.bottom));
      expect(layout.nav.top, `static nav should follow the brand/cart row at ${width}px`).toBeGreaterThanOrEqual(Math.max(layout.brand.bottom, layout.actions.bottom) - 1);
      expect(layout.document, `document should not overflow at ${width}px`).toBeLessThanOrEqual(layout.viewport);
    }
  } finally {
    await context.close();
  }
});
