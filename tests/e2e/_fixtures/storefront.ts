import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { unlockStorefront } from './auth';
const { readTestConfig } = require('../../../scripts/config/test-config.cjs');

const themeElements = ['kg-cart-drawer', 'kg-gallery', 'kg-product', 'kg-variant-picker'];

export async function handleNativeConsent(page: Page) {
  const banner = page.locator('#shopify-pc__banner');
  await expect(banner, 'Shopify native privacy banner should be visible in a fresh browser context').toBeVisible();
  const decline = banner.getByRole('button', { name: /^\s*decline(?:\s+all)?\s*$/i });
  await expect(decline, 'the native banner must expose an explicit Decline choice').toHaveCount(1);
  await decline.focus();
  await page.keyboard.press('Enter');
  await expect(banner, 'native privacy banner should close after an explicit decline').toBeHidden();
}

export async function applyConfiguredCountry(page: Page): Promise<string | undefined> {
  const { testCountry } = readTestConfig(process.env);
  if (!testCountry) return undefined;
  const countrySelect = page.locator('#GroveCountryForm select[name="country_code"]');
  await expect(countrySelect, 'TEST_COUNTRY requires the storefront native country selector').toBeVisible();
  await expect(countrySelect.locator(`option[value="${testCountry}"]`), `configured country ${testCountry} must be available in this Shopify market`).toHaveCount(1);
  if (await countrySelect.inputValue() !== testCountry) {
    const { navigationTimeoutMs } = readTestConfig(process.env);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs }),
      countrySelect.selectOption(testCountry),
    ]);
  }
  await expect(countrySelect, 'server-rendered Shopify localization should retain the selected country').toHaveValue(testCountry);
  return testCountry;
}

export async function waitForThemeUpgrade(page: Page) {
  await expect.poll(async () => page.evaluate((names) => names.every((name) => {
    const elements = Array.from(document.querySelectorAll(name));
    return elements.every((element) => element.matches(':defined'));
  }), themeElements)).toBe(true);
}

export async function prepareStorefront(page: Page) {
  await unlockStorefront(page);
  await handleNativeConsent(page);
  await applyConfiguredCountry(page);
  await waitForThemeUpgrade(page);
}

export async function navigateStorefront(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForThemeUpgrade(page);
  return response;
}

export function configuredTestCountry(): string | undefined {
  return readTestConfig(process.env).testCountry;
}

export async function firstProductUrl(page: Page): Promise<string> {
  await navigateStorefront(page, '/collections/all');
  // Skip the auto-generated Shopify gift-card product — it has a non-standard
  // add-to-cart flow (recipient email form) that breaks cart e2e specs.
  const card = page.locator('a[href*="/products/"]:not([href*="gift-card"])').first();
  await expect(card).toBeVisible();
  const href = await card.getAttribute('href');
  if (!href) throw new Error('Could not find a non-gift-card product on /collections/all');
  return href;
}

export async function getCartCount(page: Page): Promise<number> {
  const state = await readCartState(page);
  if (state.status !== 200 || state.itemCount === null) {
    throw new Error(`Could not read storefront cart state: ${JSON.stringify(state)}`);
  }
  return state.itemCount;
}

type CartState = { status: number; contentType: string | null; itemCount: number | null };

async function readCartState(page: Page): Promise<CartState> {
  return page.evaluate(async () => {
    try {
      const configElement = document.getElementById('kg-client-config');
      const rawConfig = configElement?.getAttribute('data-config');
      if (!rawConfig) return { status: 0, contentType: null, itemCount: null };
      const config = JSON.parse(rawConfig);
      const cartRoute = config?.cartRoutes?.cart;
      if (typeof cartRoute !== 'string') return { status: 0, contentType: null, itemCount: null };
      const cartUrl = new URL(cartRoute, window.location.origin);
      if (cartUrl.origin !== window.location.origin) return { status: 0, contentType: null, itemCount: null };
      const response = await fetch(cartUrl.href, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      let itemCount: number | null = null;
      try {
        const body = await response.json();
        if (Number.isSafeInteger(body?.item_count) && body.item_count >= 0) itemCount = body.item_count;
      } catch { /* keep metadata only; never retain response text */ }
      return { status: response.status, contentType: response.headers.get('content-type'), itemCount };
    } catch {
      return { status: 0, contentType: null, itemCount: null };
    }
  });
}

export async function addToCartAndVerify(page: Page, beforeCount: number): Promise<void> {
  const { actionTimeoutMs } = readTestConfig(process.env);
  const failures: Array<{ method: string; path: string }> = [];
  const onRequestFailed = (request: import('@playwright/test').Request) => {
    const url = new URL(request.url());
    if (/\/cart\/add(?:\.js)?\/?$/.test(url.pathname)) failures.push({ method: request.method(), path: url.pathname });
  };
  page.on('requestfailed', onRequestFailed);
  let addResponse: import('@playwright/test').Response | null = null;

  try {
    const responsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return /\/cart\/add(?:\.js)?\/?$/.test(url.pathname);
    }, { timeout: actionTimeoutMs }).catch(() => null);
    const form = page.locator('[data-kg-product-form]');
    await expect(form, 'product add-to-cart form').toBeAttached();
    const requestedQuantity = await form.evaluate((element) => {
      const submitted = new FormData(element).get('quantity');
      if (submitted === null) return 1;
      const quantity = Number(submitted);
      return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
    });
    if (requestedQuantity !== 1) {
      throw new Error(`Expected effective single-item quantity 1 before submission; observed ${String(requestedQuantity)}.`);
    }
    const button = page.getByRole('button', { name: /add to cart|add to bag/i }).first();
    await expect(button, 'product add-to-cart control').toBeEnabled();
    await button.click();
    addResponse = await responsePromise;
  } finally {
    page.off('requestfailed', onRequestFailed);
  }

  const cart = await readCartState(page);
  const add = addResponse ? {
    status: addResponse.status(),
    method: addResponse.request().method(),
    path: new URL(addResponse.url()).pathname,
  } : null;
  const evidence = { requestedQuantity: 1, addResponse: add, addRequestFailures: failures, cart };
  if (!addResponse || addResponse.status() >= 400 || cart.status !== 200 || cart.itemCount === null || cart.itemCount !== beforeCount + 1) {
    throw new Error(`Add-to-cart failed with observed response/cart evidence: ${JSON.stringify(evidence)}`);
  }
  await expect(page.locator('[data-kg-product-form] button[type="submit"]').first(), 'successful add must settle the submitter UI').not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('[data-kg-atc-error]'), 'a confirmed successful add must not display an uncertain-cart error').not.toBeVisible();
}
