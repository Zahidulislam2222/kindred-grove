import { test, expect, type Page } from '@playwright/test';
import { unlockStorefront } from './_fixtures/auth';
const { readTestConfig } = require('../../scripts/config/test-config.cjs');
const testConfig = readTestConfig(process.env);

const signals = [
  { name: 'gpc-true', signal: 'gpc' as const },
  { name: 'dnt-one', signal: 'dnt' as const },
];

async function installSignal(context: import('@playwright/test').BrowserContext, signal: 'gpc' | 'dnt') {
  await context.addInitScript((selectedSignal) => {
    if (selectedSignal === 'gpc') {
      Object.defineProperty(window.navigator, 'globalPrivacyControl', { configurable: true, value: true });
    } else {
      Object.defineProperty(window.navigator, 'doNotTrack', { configurable: true, value: '1' });
    }
  }, signal);
}

async function acceptNativeConsent(page: Page) {
  const banner = page.locator('#shopify-pc__banner');
  await expect(banner, 'fresh isolated context should show Shopify native consent banner').toBeVisible();
  const accept = page.locator('#shopify-pc__banner__btn-accept');
  await expect(accept, 'native Accept action').toBeVisible();
  await accept.focus();
  await page.keyboard.press('Enter');
  await expect(banner).toBeHidden();
}

async function readSignalEvidence(page: Page, signal: 'gpc' | 'dnt') {
  return page.evaluate(async (selectedSignal) => {
    const adapter = (window as any).KGPrivacy;
    const nativePrivacy = (window as any).Shopify?.customerPrivacy;
    if (!adapter || !nativePrivacy) throw new Error('Native privacy API or theme adapter unavailable.');
    const ready = await adapter.ready;
    const config = adapter.configValid ? adapter.config : null;
    const visitorKey = config?.storageKeys?.featureFlagVisitor;
    const hasKey = (storage: Storage) => {
      for (let index = 0; index < storage.length; index += 1) {
        if (storage.key(index) === visitorKey) return true;
      }
      return false;
    };
    return {
      signalObserved: selectedSignal === 'gpc'
        ? (window.navigator as any).globalPrivacyControl === true
        : (window.navigator as any).doNotTrack === '1',
      ready: ready === true,
      configValid: adapter.configValid === true,
      preferencesConsent: nativePrivacy.currentVisitorConsent()?.preferences ?? null,
      snapshot: adapter.snapshot(),
      visitorKeyAbsentFromLocalStorage: typeof visitorKey === 'string' && !hasKey(window.localStorage),
      visitorKeyAbsentFromSessionStorage: typeof visitorKey === 'string' && !hasKey(window.sessionStorage),
    };
  }, signal);
}

test.describe('explicit GPC and DNT signal handling', () => {
  for (const scenario of signals) {
    test(`${scenario.name} keeps optional analytics purposes denied after native Accept`, async ({ browser }) => {
      const context = await browser.newContext();
      try {
        await installSignal(context, scenario.signal);
        const page = await context.newPage();
        page.setDefaultTimeout(testConfig.actionTimeoutMs);
        page.setDefaultNavigationTimeout(testConfig.navigationTimeoutMs);
        await unlockStorefront(page);
        await acceptNativeConsent(page);
        await expect.poll(async () => page.evaluate(async () => {
          const adapter = (window as any).KGPrivacy;
          if (!adapter) return false;
          return await adapter.ready === true;
        })).toBe(true);

        const evidence = await readSignalEvidence(page, scenario.signal);
        expect(evidence.signalObserved).toBe(true);
        expect(evidence.ready).toBe(true);
        expect(evidence.configValid).toBe(true);
        expect(evidence.preferencesConsent).toBe('yes');
        expect(evidence.snapshot.preferences).toBe(true);
        expect(evidence.snapshot.analytics).toBe(false);
        expect(evidence.snapshot.marketing).toBe(false);
        expect(evidence.snapshot.sale_of_data).toBe(false);
        expect(evidence.visitorKeyAbsentFromLocalStorage).toBe(true);
        expect(evidence.visitorKeyAbsentFromSessionStorage).toBe(true);
      } finally {
        await context.close();
      }
    });
  }
});
