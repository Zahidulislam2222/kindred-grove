import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { prepareStorefront, navigateStorefront } from './_fixtures/storefront';
const content = require('../../content/storefront-pages.json');

test.beforeEach(async ({ page }) => { await prepareStorefront(page); });

for (const width of [1440, 390, 320]) {
  test(`all storefront pages render with working navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const item of content.pages) {
      const response = await navigateStorefront(page, `/pages/${item.handle}`);
      expect(response?.status(), `canonical page ${item.handle}`).toBe(200);
      await expect(page.locator('main h1')).toHaveText(item.title);
      await expect(page.locator('.grove-page__content')).not.toBeEmpty();
      await expect(page.locator('.kg-demo-notice, .kg-demo-price-label, .kg-demo-disabled-message')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const nav = page.locator('grove-header .grove-nav');
      await expect(nav.locator('a')).toHaveCount(5);
      if (width < 750) {
        await page.locator('.grove-menu-toggle').click();
        await expect(nav).toBeVisible();
      }
      await nav.getByRole('link', { name: 'Our Story', exact: true }).click();
      await expect(page).toHaveURL(/\/pages\/our-story/);
    }
  });
}

test('FAQ is keyboard operable and contact/wholesale use native forms', async ({ page }) => {
  await navigateStorefront(page, '/pages/faq');
  const answer = page.locator('.grove-faq').first();
  await answer.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(answer).toHaveAttribute('open', '');
  await expect(answer.locator('p')).toBeVisible();
  await navigateStorefront(page, '/pages/contact');
  await expect(page.locator('#GroveContact input[type="email"]')).toBeVisible();
  await expect(page.locator('#GroveContact textarea')).toBeVisible();
  await navigateStorefront(page, '/pages/wholesale');
  await expect(page.locator('#WholesaleInquiryForm')).toBeVisible();
  await expect(page.locator('#WholesaleInquiryForm button[type="submit"]')).toBeEnabled();
});

test('header search finds a native product and reflows on mobile', async ({ page }) => {
  await navigateStorefront(page, '/collections/all');
  const productLink = page.locator('main a[href*="/products/"]').first();
  await productLink.click();
  const productTitle = await page.locator('main h1').innerText();
  await page.locator('grove-header').getByRole('link', { name: 'Search', exact: true }).click();
  await page.locator('#GroveSearch').fill(productTitle);
  await page.locator('.grove-search__form button[type="submit"]').click();
  await expect(page.locator('.grove-search__results').getByRole('link', { name: productTitle, exact: true })).toBeVisible();
  await expect(page.locator('#GroveSearch')).toHaveValue(productTitle);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).exclude('[id^="PBar"]').analyze();
  expect(result.violations).toEqual([]);
});

test('quiz remains visible after accepting consent with a stored disabled assignment', async ({ page }) => {
  await navigateStorefront(page, '/pages/quiz');
  await expect(page.locator('[data-kg-quiz-shell]')).toBeVisible();
  const preferences=page.locator('[data-kg-open-privacy-preferences]');
  await preferences.focus();await page.keyboard.press('Enter');
  // Use the native preference dialog's Accept all control, discovered by its label.
  const acceptAll=page.getByRole('button',{name:/^Accept all$/i});
  await expect(acceptAll).toBeVisible();await acceptAll.focus();await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>(window as any).KGPrivacy.allowed('analytics'))).toBe(true);
  await page.evaluate(()=>{
    const config=JSON.parse(document.getElementById('kg-privacy-config')!.dataset.config!);
    localStorage.setItem(config.storageKeys.featureFlagAssignments,JSON.stringify({pantry_quiz:'off'}));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-kg-quiz-shell]')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).KG_FF._defs.some((d:any)=>d.name==='pantry_quiz'))).toBe(false);
});

for (const item of content.pages) {
  test(`page ${item.handle} passes axe WCAG checks`, async ({ page }) => {
    await navigateStorefront(page, `/pages/${item.handle}`);
    await expect(page.locator('main h1')).toHaveText(item.title);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).exclude('[id^="PBar"]').analyze();
    expect(result.violations).toEqual([]);
  });
}
