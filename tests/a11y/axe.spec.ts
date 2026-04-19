import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { unlockStorefront } from '../e2e/_fixtures/auth';

const routes = ['/', '/cart', '/collections/all', '/search?q=olive'];

test.describe('Accessibility — axe WCAG 2.1 AA', () => {
  test.beforeEach(async ({ page }) => {
    await unlockStorefront(page);
  });

  for (const route of routes) {
    test(`route ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response, `navigation to ${route} returned no response`).not.toBeNull();
      expect(response!.status(), `status for ${route}`).toBeLessThan(400);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(
        results.violations,
        `axe violations on ${route}:\n${JSON.stringify(results.violations, null, 2)}`
      ).toEqual([]);
    });
  }
});
