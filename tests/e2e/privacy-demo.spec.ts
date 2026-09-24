import { Buffer } from 'node:buffer';
import type { Page, Request, Response, TestInfo } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { firstProductUrl, handleNativeConsent, navigateStorefront } from './_fixtures/storefront';
import { unlockStorefront } from './_fixtures/auth';
const { readTestConfig } = require('../../scripts/config/test-config.cjs');

type ConsentValue = 'yes' | 'no' | 'unknown' | 'other';
type PrivacyEvidence = {
  ready: boolean;
  configValid: boolean;
  optionalTelemetryEnabled: boolean | null;
  consent: Record<'preferences' | 'analytics' | 'marketing' | 'sale_of_data', ConsentValue>;
  allowed: Record<'preferences' | 'analytics' | 'marketing' | 'sale_of_data', boolean>;
  themeStorageKeys: string[];
};

const purposes = ['preferences', 'analytics', 'marketing', 'sale_of_data'] as const;
const allDenied = { preferences: false, analytics: false, marketing: false, sale_of_data: false };
const knownNamedThemeAssets = /\/(?:privacy|client-runtime|feature-flags|announcement-bar|quick-view|cart-drawer|pantry-quiz|wholesale-form|predictive-search|theme|privacy-preferences|grove)\.js$/i;
const removedThemeSdkMarkers: Array<[string, RegExp]> = [
  ['sentry-init', /\bSentry\.init\s*\(/i],
  ['google-tag-call', /\bgtag\s*\(/i],
  ['data-layer-send', /\bdataLayer\s*\.\s*push\s*\(/i],
  ['clarity-init', /\bclarity\s*\(/i],
  ['hotjar-init', /\bhotjar\s*\(/i],
  ['segment-load', /\banalytics\.load\s*\(/i],
  ['facebook-pixel-call', /\bfbq\s*\(/i],
];

async function readPrivacyEvidence(page: Page): Promise<PrivacyEvidence> {
  return page.evaluate(async (purposeNames): Promise<PrivacyEvidence> => {
    const runtime = window as any;
    const adapter = runtime.KGPrivacy;
    const ready = !!adapter && await adapter.ready === true;
    const privacy = runtime.Shopify?.customerPrivacy;
    if (!privacy || typeof privacy.currentVisitorConsent !== 'function' || !adapter) {
      throw new Error('Shopify native privacy API or theme adapter is unavailable.');
    }

    const rawConsent = privacy.currentVisitorConsent();
    const consent = Object.fromEntries(purposeNames.map((purpose) => {
      const value = rawConsent?.[purpose];
      return [purpose, value === 'yes' || value === 'no' ? value : value === '' || value == null ? 'unknown' : 'other'];
    })) as PrivacyEvidence['consent'];
    const config = adapter.configValid ? adapter.config : null;
    const keyConfig = config?.storageKeys || {};
    const exactKeys = Object.entries(keyConfig)
      .filter(([name, value]) => name !== 'legacyAnnouncementDismissalPrefix' && typeof value === 'string')
      .map(([, value]) => value as string);
    const prefixes = ['featureFlagOverridePrefix', 'legacyAnnouncementDismissalPrefix']
      .map((name) => keyConfig[name])
      .filter((value): value is string => typeof value === 'string');
    const themeStorageKeys = [window.localStorage, window.sessionStorage].flatMap((storage) => {
      const names = Object.keys(storage);
      return names.filter((name) => exactKeys.includes(name) || prefixes.some((prefix) => name.startsWith(prefix)));
    }).sort();

    return {
      ready,
      configValid: adapter.configValid === true,
      optionalTelemetryEnabled: config?.optionalTelemetryEnabled ?? null,
      consent,
      allowed: adapter.snapshot(),
      themeStorageKeys,
    };
  }, purposes);
}

function attachRequestCategories(page: Page, testInfo: TestInfo) {
  const { baseUrl } = readTestConfig(process.env);
  const storeOrigin = new URL(baseUrl).origin;
  const categories = new Set<string>();
  const namedThemeSdkMarkers = new Set<string>();
  const bodyChecks: Promise<void>[] = [];
  let inspectedNamedThemeScriptBodies = 0;

  page.on('request', (request: Request) => {
    const url = new URL(request.url());
    const host = url.origin === storeOrigin
      ? 'storefront'
      : /(?:^|\.)(?:shopify\.com|shopifycdn\.com|myshopify\.com)$/i.test(url.hostname)
        ? 'shopify-managed'
        : 'third-party';
    const path = /\/assets\//i.test(url.pathname)
      ? 'theme-or-store-asset'
      : /\/cart(?:\/|$)/i.test(url.pathname)
        ? 'cart-route'
        : /\/products?\//i.test(url.pathname)
          ? 'product-route'
          : /\/collections?\//i.test(url.pathname)
            ? 'collection-route'
            : /\/pages?\//i.test(url.pathname)
              ? 'content-route'
              : request.resourceType() === 'document'
                ? 'storefront-document'
                : request.resourceType();
    categories.add(`${host}:${path}`);
  });

  page.on('response', (response: Response) => {
    const url = new URL(response.url());
    if (!knownNamedThemeAssets.test(url.pathname) || !response.ok()) return;
    const check = response.text().then((source) => {
      inspectedNamedThemeScriptBodies += 1;
      for (const [name, marker] of removedThemeSdkMarkers) {
        if (marker.test(source)) namedThemeSdkMarkers.add(name);
      }
    }).catch(() => undefined);
    bodyChecks.push(check);
  });

  return async () => {
    await Promise.all(bodyChecks);
    await testInfo.attach('privacy-demo-request-categories.json', {
      body: Buffer.from(JSON.stringify({ categories: Array.from(categories).sort() }, null, 2)),
      contentType: 'application/json',
    });
    return {
      inspectedNamedThemeScriptBodies,
      inspectionScope: 'named-authored-theme-assets-only',
      namedThemeSdkMarkers: Array.from(namedThemeSdkMarkers).sort(),
    };
  };
}

test.describe('privacy and demo storefront integration', () => {
  test('native consent accepts, saves partial preferences, withdraws, and persists after reload', async ({ page }, testInfo) => {
    const finishRequestEvidence = attachRequestCategories(page, testInfo);
    await unlockStorefront(page);

    const banner = page.locator('#shopify-pc__banner');
    await expect(banner, 'fresh isolated context must show Shopify native consent banner').toBeVisible();
    const initial = await readPrivacyEvidence(page);
    expect(initial.ready).toBe(true);
    expect(initial.configValid).toBe(true);
    expect(initial.consent).toEqual({ preferences: 'unknown', analytics: 'unknown', marketing: 'unknown', sale_of_data: 'unknown' });
    expect(initial.allowed).toEqual(allDenied);
    expect(initial.themeStorageKeys).toEqual([]);

    // Shopify's development preview iframe may cover the banner's pointer hitbox;
    // keyboard activation exercises the same visible native control.
    const accept = page.locator('#shopify-pc__banner__btn-accept');
    await expect(accept, 'native banner Accept control').toBeVisible();
    await accept.focus();
    await page.keyboard.press('Enter');
    await expect(banner).toBeHidden();
    await expect.poll(async () => (await readPrivacyEvidence(page)).consent.analytics).toBe('yes');

    const accepted = await readPrivacyEvidence(page);
    expect(accepted.consent).toEqual({ preferences: 'yes', analytics: 'yes', marketing: 'yes', sale_of_data: 'unknown' });
    expect(accepted.allowed).toEqual({ preferences: true, analytics: true, marketing: true, sale_of_data: false });
    expect(accepted.themeStorageKeys).toContain('kg_ff_visitor');

    const reopen = page.locator('button[data-kg-open-privacy-preferences]');
    await expect(reopen).toBeVisible();
    await reopen.focus();
    await page.keyboard.press('Enter');
    const personalization = page.locator('#shopify-pc__prefs__preferences-input');
    const marketing = page.locator('#shopify-pc__prefs__marketing-input');
    const analytics = page.locator('#shopify-pc__prefs__analytics-input');
    await expect(personalization).toBeChecked();
    await expect(marketing).toBeChecked();
    await expect(analytics).toBeChecked();

    for (const control of [marketing, analytics]) {
      await control.focus();
      await page.keyboard.press('Space');
      await expect(control).not.toBeChecked();
    }
    const saveChoices = page.locator('#shopify-pc__prefs__header-save');
    await expect(saveChoices).toBeVisible();
    await saveChoices.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await readPrivacyEvidence(page)).consent.analytics).toBe('no');

    const partial = await readPrivacyEvidence(page);
    expect(partial.consent).toEqual({ preferences: 'yes', analytics: 'no', marketing: 'no', sale_of_data: 'unknown' });
    expect(partial.allowed).toEqual({ preferences: true, analytics: false, marketing: false, sale_of_data: false });
    expect(partial.themeStorageKeys).toEqual([]);

    await reopen.focus();
    await page.keyboard.press('Enter');
    const declineAll = page.locator('#shopify-pc__prefs__header-decline');
    await expect(declineAll).toBeVisible();
    await declineAll.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await readPrivacyEvidence(page)).consent.preferences).toBe('no');

    const withdrawn = await readPrivacyEvidence(page);
    expect(withdrawn.consent).toEqual({ preferences: 'no', analytics: 'no', marketing: 'no', sale_of_data: 'unknown' });
    expect(withdrawn.allowed).toEqual(allDenied);
    expect(withdrawn.themeStorageKeys).toEqual([]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(banner, 'native withdrawal should remain in effect after reload').toBeHidden();
    const afterReload = await readPrivacyEvidence(page);
    expect(afterReload.consent).toEqual(withdrawn.consent);
    expect(afterReload.allowed).toEqual(allDenied);
    expect(afterReload.themeStorageKeys).toEqual([]);

    const scripts = await finishRequestEvidence();
    expect(scripts.inspectionScope).toBe('named-authored-theme-assets-only');
    expect(scripts.inspectedNamedThemeScriptBodies).toBeGreaterThan(0);
    expect(scripts.namedThemeSdkMarkers).toEqual([]);
  });

  test('fresh native consent starts unknown, explicit reject remains denied after reload', async ({ page }, testInfo) => {
    const finishRequestEvidence = attachRequestCategories(page, testInfo);
    await unlockStorefront(page);

    const banner = page.locator('#shopify-pc__banner');
    await expect(banner, 'fresh isolated context must show Shopify native consent banner').toBeVisible();
    const initial = await readPrivacyEvidence(page);
    expect(initial.ready).toBe(true);
    expect(initial.configValid).toBe(true);
    expect(initial.optionalTelemetryEnabled).toBe(false);
    expect(initial.consent).toEqual({ preferences: 'unknown', analytics: 'unknown', marketing: 'unknown', sale_of_data: 'unknown' });
    expect(initial.allowed).toEqual(allDenied);
    expect(initial.themeStorageKeys).toEqual([]);

    // This accessible Decline control is already exercised by the guarded fixture.
    const decline = banner.getByRole('button', { name: /^\s*decline(?:\s+all)?\s*$/i });
    await expect(decline).toHaveCount(1);
    await decline.focus();
    await page.keyboard.press('Enter');
    await expect(banner).toBeHidden();
    await expect.poll(async () => (await readPrivacyEvidence(page)).consent).toMatchObject({
      preferences: 'no',
      analytics: 'no',
      marketing: 'no',
    });

    const rejected = await readPrivacyEvidence(page);
    expect(rejected.consent.preferences).toBe('no');
    expect(rejected.consent.analytics).toBe('no');
    expect(rejected.consent.marketing).toBe('no');
    expect(rejected.allowed).toEqual(allDenied);
    expect(rejected.themeStorageKeys).toEqual([]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(banner, 'native banner should preserve the explicit denial after reload').toBeHidden();
    const afterReload = await readPrivacyEvidence(page);
    expect(afterReload.consent).toEqual(rejected.consent);
    expect(afterReload.allowed).toEqual(allDenied);
    expect(afterReload.themeStorageKeys).toEqual([]);

    const scripts = await finishRequestEvidence();
    expect(scripts.inspectionScope).toBe('named-authored-theme-assets-only');
    expect(scripts.inspectedNamedThemeScriptBodies).toBeGreaterThan(0);
    expect(scripts.namedThemeSdkMarkers).toEqual([]);
  });

  test('demo product price, notice, PII controls, JSON-LD and visible checkout path match demo mode', async ({ page }, testInfo) => {
    const finishRequestEvidence = attachRequestCategories(page, testInfo);
    // Deliberately do not use prepareStorefront here: it auto-declines the banner.
    await unlockStorefront(page);
    await handleNativeConsent(page);

    const productPath = await firstProductUrl(page);
    const productUrl = new URL(productPath, page.url());
    if (productUrl.origin !== new URL(page.url()).origin) throw new Error('The observed product link escaped the storefront origin.');
    const response = await navigateStorefront(page, productUrl.pathname);
    if (!response) throw new Error('Product navigation completed without an HTTP response.');
    expect(response.status(), `product route returned HTTP ${response.status()}`).toBeLessThan(400);

    await expect(page.locator('body')).toHaveAttribute('data-demo-mode', 'true');
    await expect(page.locator('.kg-demo-notice')).toBeVisible();
    await expect(page.locator('.kg-price .kg-demo-price-label').first()).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await expect(page.locator('meta[property^="product:price:"]')).toHaveCount(0);
    await expect(page.locator('meta[property="product:availability"]')).toHaveCount(0);

    // The native country form is an allowed preference control; personal-data
    // newsletter/contact inputs and their active submission paths are absent.
    await expect(page.locator('footer input[name="contact[email]"], footer input[type="email"]')).toHaveCount(0);
    await expect(page.locator('footer form[action*="contact"], footer form[action*="customer"]')).toHaveCount(0);
    await expect(page.locator('form[action*="contact"]')).toHaveCount(0);

    const cartOpener = page.locator('[data-kg-cart-open]').first();
    await expect(cartOpener).toBeVisible();
    await cartOpener.click();
    const drawer = page.locator('#CartDrawer [role="dialog"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-demo-checkout]')).toBeDisabled();
    await expect(drawer.locator('button[name="checkout"], input[name="checkout"]')).toHaveCount(0);
    await expect(drawer.locator('[name="note"], [data-kg-cart-note]')).toHaveCount(0);
    await expect(drawer.locator('.kg-demo-price-label')).toBeVisible();

    const scripts = await finishRequestEvidence();
    expect(scripts.inspectionScope).toBe('named-authored-theme-assets-only');
    expect(scripts.inspectedNamedThemeScriptBodies).toBeGreaterThan(0);
    expect(scripts.namedThemeSdkMarkers).toEqual([]);
  });
});

test('theme-rendered wholesale contact route has no active contact form in demo mode', async ({ page }) => {
  await unlockStorefront(page);
  await handleNativeConsent(page);
  const { baseUrl } = readTestConfig(process.env);
  const storefrontOrigin = new URL(baseUrl).origin;
  const response = await page.goto('/pages/wholesale', { waitUntil: 'domcontentloaded' });
  if (!response) throw new Error('Wholesale navigation completed without an HTTP response.');
  if (response.status() === 404) test.skip(true, 'The merchant has no /pages/wholesale content route (observed HTTP 404).');
  expect(response.status(), `wholesale route returned HTTP ${response.status()}`).toBeLessThan(400);
  if (new URL(page.url()).origin !== storefrontOrigin) test.skip(true, 'Wholesale route redirected outside the storefront origin.');
  await expect(page.locator('body')).toHaveAttribute('data-demo-mode', 'true');
  await expect(page.locator('form[action*="contact"]')).toHaveCount(0);
  await expect(page.locator('.kg-demo-disabled-message').first()).toBeVisible();
});

test('theme-rendered customer account login has no active personal-data form in demo mode', async ({ page }) => {
  await unlockStorefront(page);
  await handleNativeConsent(page);
  const { baseUrl } = readTestConfig(process.env);
  const storefrontOrigin = new URL(baseUrl).origin;
  const response = await page.goto('/account/login', { waitUntil: 'domcontentloaded' });
  if (!response) throw new Error('Customer account navigation completed without an HTTP response.');
  if (new URL(page.url()).origin !== storefrontOrigin) {
    test.skip(true, 'Customer login redirected to a Shopify-hosted account surface outside theme rendering.');
  }
  if (response.status() === 404) test.skip(true, 'Classic customer login is unavailable at the observed storefront route (HTTP 404).');
  expect(response.status(), `customer login route returned HTTP ${response.status()}`).toBeLessThan(400);
  await expect(page.locator('body')).toHaveAttribute('data-demo-mode', 'true');
  await expect(page.locator('.kg-account form')).toHaveCount(0);
  await expect(page.locator('.kg-account .kg-demo-disabled-message')).toBeVisible();
});

test('theme-rendered article comments have no active personal-data form in demo mode', async ({ page }) => {
  await unlockStorefront(page);
  await handleNativeConsent(page);
  const response = await page.goto('/blogs/news', { waitUntil: 'domcontentloaded' });
  if (!response) throw new Error('Blog navigation completed without an HTTP response.');
  if (response.status() === 404) test.skip(true, 'The merchant has no /blogs/news route (observed HTTP 404).');
  expect(response.status(), `blog route returned HTTP ${response.status()}`).toBeLessThan(400);

  const articleLink = page.locator('main a[href*="/blogs/"]').filter({ has: page.locator('h2, h3') }).first();
  const articleCount = await articleLink.count();
  if (articleCount === 0) test.skip(true, 'The /blogs/news listing has no article link to exercise (observed zero matching links).');
  const href = await articleLink.getAttribute('href');
  if (!href) throw new Error('The observed blog article link has no href.');
  const articleUrl = new URL(href, page.url());
  if (articleUrl.origin !== new URL(page.url()).origin) throw new Error('The blog article link escaped the storefront origin.');
  const articleResponse = await page.goto(articleUrl.href, { waitUntil: 'domcontentloaded' });
  if (!articleResponse) throw new Error('Article navigation completed without an HTTP response.');
  expect(articleResponse.status(), `article route returned HTTP ${articleResponse.status()}`).toBeLessThan(400);
  await expect(page.locator('body')).toHaveAttribute('data-demo-mode', 'true');

  await expect(page.locator('.kg-article__comments form')).toHaveCount(0);
  const comments = page.locator('.kg-article__comments');
  if (await comments.count() > 0) {
    await expect(comments.locator('.kg-demo-disabled-message')).toBeVisible();
  }
});
