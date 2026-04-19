import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function firstProductUrl(page: Page): Promise<string> {
  await page.goto('/collections/all', { waitUntil: 'domcontentloaded' });
  const card = page.locator('a[href*="/products/"]').first();
  await expect(card).toBeVisible();
  const href = await card.getAttribute('href');
  if (!href) throw new Error('Could not find a product card on /collections/all');
  return href;
}

export async function getCartCount(page: Page): Promise<number> {
  const node = page.locator('[data-cart-count]').first();
  if ((await node.count()) === 0) return 0;
  const text = (await node.innerText()).trim();
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? n : 0;
}
