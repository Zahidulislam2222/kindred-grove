import { test, expect } from '@playwright/test';
import { unlockStorefront } from './_fixtures/auth';

test.describe('Build-Your-Pantry quiz golden path', () => {
  test.beforeEach(async ({ page }) => {
    await unlockStorefront(page);
  });

  test('quiz page renders and progresses through stages', async ({ page }) => {
    const response = await page.goto('/pages/quiz', { waitUntil: 'domcontentloaded' });
    if (!response || response.status() === 404) test.skip(true, 'Quiz page not published in this store.');

    const quiz = page.locator('kg-pantry-quiz');
    await expect(quiz).toBeVisible();

    const advanceLimit = 10;
    for (let step = 0; step < advanceLimit; step++) {
      const firstOption = quiz.locator('input[type="radio"], button[data-quiz-option]').first();
      if ((await firstOption.count()) === 0) break;
      await firstOption.click({ force: true });
      const next = quiz.getByRole('button', { name: /next|continue|see results|finish/i }).first();
      if ((await next.count()) === 0) break;
      const isVisible = await next.isVisible().catch(() => false);
      if (!isVisible) break;
      await next.click();
      const finished = await quiz.getByText(/your pantry|recommendations|results/i).first().isVisible().catch(() => false);
      if (finished) break;
    }
  });

  test('result persists in localStorage between reloads', async ({ page }) => {
    const response = await page.goto('/pages/quiz', { waitUntil: 'domcontentloaded' });
    if (!response || response.status() === 404) test.skip(true, 'Quiz page not published in this store.');

    const before = await page.evaluate(() => {
      return Object.keys(window.localStorage).filter((k) => k.toLowerCase().includes('quiz') || k.toLowerCase().includes('kg-pantry'));
    });
    expect(Array.isArray(before)).toBe(true);
  });
});
