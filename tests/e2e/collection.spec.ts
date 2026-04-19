import { test, expect } from '@playwright/test';
import { unlockStorefront } from './_fixtures/auth';

test.describe('Collection (PLP) golden path', () => {
  test.beforeEach(async ({ page }) => {
    await unlockStorefront(page);
  });

  test('renders product grid with at least one card', async ({ page }) => {
    const response = await page.goto('/collections/all', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    const cards = page.locator('a[href*="/products/"]');
    await expect(cards.first()).toBeVisible();
  });

  test('opens a product card and lands on its PDP', async ({ page }) => {
    await page.goto('/collections/all', { waitUntil: 'domcontentloaded' });
    const firstCardLink = page.locator('a[href*="/products/"]').first();
    const href = await firstCardLink.getAttribute('href');
    expect(href).toBeTruthy();
    await firstCardLink.click();
    await page.waitForURL(/\/products\//);
    await expect(page).toHaveURL(new RegExp(href!.split('?')[0]));
  });

  test('changing sort updates URL with sort_by param', async ({ page }) => {
    await page.goto('/collections/all', { waitUntil: 'domcontentloaded' });
    const sortControl = page.locator('select[name="sort_by"], [data-sort] select').first();
    if ((await sortControl.count()) === 0) test.skip(true, 'Sort control not present on this collection.');
    await sortControl.selectOption({ index: 1 });
    await page.waitForURL(/sort_by=/);
    await expect(page).toHaveURL(/sort_by=/);
  });
});
