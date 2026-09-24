import { test, expect } from '@playwright/test';
import { navigateStorefront, prepareStorefront } from './_fixtures/storefront';

test.describe('Build-Your-Pantry quiz golden path', () => {
  test.beforeEach(async ({ page }) => {
    await prepareStorefront(page);
  });

  test('answers every configured question, renders a safe collection result, and forgets answers on reload', async ({ page }) => {
    const response = await navigateStorefront(page, '/pages/quiz');
    if (!response) throw new Error('Quiz navigation completed without an HTTP response.');
    if (response.status() === 404) test.skip(true, 'Quiz page returned an evidenced 404 in this store.');
    expect(response.status(), `quiz route returned HTTP ${response.status()}`).toBeLessThan(400);

    const quiz = page.locator('kg-pantry-quiz');
    await expect.poll(() => quiz.evaluate((element) => element.matches(':defined'))).toBe(true);
    await expect(quiz.locator('[data-kg-quiz-shell]')).toBeVisible();

    const questionCount = await quiz.locator('[data-kg-quiz-questions]').evaluate((element) => {
      const parsed = JSON.parse((element as HTMLTemplateElement).dataset.json || 'null');
      return Array.isArray(parsed) ? parsed.length : 0;
    });
    expect(questionCount).toBeGreaterThan(0);

    const legacyAnswerKey = await page.evaluate(() => {
      const element = document.getElementById('kg-privacy-config');
      const config = JSON.parse(element?.dataset.config || '{}');
      return config.storageKeys?.legacyQuizAnswers;
    });
    if (typeof legacyAnswerKey !== 'string' || !legacyAnswerKey) throw new Error('Quiz legacy answer key is missing from valid privacy configuration.');

    for (let index = 0; index < questionCount; index += 1) {
      const option = quiz.locator('[data-kg-quiz-stage] input[type="radio"]').first();
      await expect(option, `question ${index + 1} should expose a radio choice`).toBeVisible();
      await option.check();
      const next = quiz.locator('[data-kg-quiz-next]');
      await expect(next).toBeEnabled();
      await next.click();
    }

    const result = quiz.locator('.kg-quiz__result');
    await expect(result).toBeVisible();
    await expect(result.locator('.kg-quiz__result-name')).not.toBeEmpty();
    const collectionLink = result.locator('a.button').first();
    await expect(collectionLink).toBeVisible();
    const href = await collectionLink.getAttribute('href');
    expect(href).toBeTruthy();
    const resultUrl = new URL(href!, page.url());
    expect(resultUrl.origin).toBe(new URL(page.url()).origin);
    expect(resultUrl.pathname).toMatch(/\/collections\/[a-z0-9][a-z0-9_-]*\/?$/i);

    const ownedAnswerStorage = await page.evaluate((key) => ({
      localStorageKeys: Object.keys(window.localStorage).filter((name) => name === key || [':', '-', '_'].some((separator) => name.startsWith(`${key}${separator}`))),
      sessionStorageKeys: Object.keys(window.sessionStorage).filter((name) => name === key || [':', '-', '_'].some((separator) => name.startsWith(`${key}${separator}`))),
    }), legacyAnswerKey);
    expect(ownedAnswerStorage).toEqual({ localStorageKeys: [], sessionStorageKeys: [] });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => quiz.evaluate((element) => element.matches(':defined'))).toBe(true);
    await expect(quiz.locator('[data-kg-quiz-shell]')).toBeVisible();
    await expect(quiz.locator('[data-kg-quiz-stage] input[type="radio"]').first()).not.toBeChecked();
    await expect(quiz.locator('.kg-quiz__result')).toHaveCount(0);
  });
});
