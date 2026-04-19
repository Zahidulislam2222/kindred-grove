import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { unlockStorefront } from '../e2e/_fixtures/auth';

const routes = ['/', '/cart', '/collections/all', '/search?q=olive'];

/**
 * Third-party markup we don't control — Shopify injects these into every
 * storefront and we can't modify their HTML. Exclude from the scan so CI
 * fails only on bugs in *our* theme.
 *
 *   [id^="PBar"]          Shopify preview/promotional bar iframe (dev-only)
 *   [class^="_GrabberButton"]   Cookie/consent banner (Polaris web component)
 *   #shopify-section-shopify   Shopify app-injected section wrapper
 */
const thirdPartyExcludes = [
  '[id^="PBar"]',
  '[class^="_GrabberButton"]',
  '#shopify-section-shopify',
];

test.describe('Accessibility — axe WCAG 2.1 AA', () => {
  test.beforeEach(async ({ page }) => {
    await unlockStorefront(page);
  });

  for (const route of routes) {
    test(`route ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response, `navigation to ${route} returned no response`).not.toBeNull();
      expect(response!.status(), `status for ${route}`).toBeLessThan(400);

      let builder = new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
      ]);
      for (const selector of thirdPartyExcludes) {
        builder = builder.exclude(selector);
      }
      const results = await builder.analyze();

      expect(
        results.violations,
        `axe violations on ${route}:\n${JSON.stringify(results.violations, null, 2)}`
      ).toEqual([]);
    });
  }
});
