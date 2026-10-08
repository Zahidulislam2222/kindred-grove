const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const config = JSON.parse(fs.readFileSync('snippets/privacy-config.liquid', 'utf8').match(/\{%- capture kg_privacy_config -%\}([\s\S]*?)\{%- endcapture -%\}/)[1]);
const source = fs.readFileSync('assets/privacy.js', 'utf8');

function harness({ consent = {}, allowed = {}, signals = {}, configValue = config, loadError = null, noLoader = false, storageEntries = [] } = {}) {
  const events = {};
  const listeners = [];
  let loadCalls = 0;
  let loadedFeatures = null;
  const stored = new Map(storageEntries);
  const localStorage = {
    get length() { return stored.size; },
    key(index) { return Array.from(stored.keys())[index] ?? null; },
    removeItem(key) { stored.delete(key); },
    getItem(key) { return stored.get(key) ?? null; },
    setItem(key, value) { stored.set(key, String(value)); }
  };
  const document = {
    getElementById: () => ({ dataset: { config: JSON.stringify(configValue) } }),
    addEventListener: (name, fn) => { events[name] = fn; },
    dispatchEvent: (event) => { listeners.push(event); }
  };
  const customerPrivacy = {
    currentVisitorConsent: () => consent,
    preferencesProcessingAllowed: () => allowed.preferences === true,
    analyticsProcessingAllowed: () => allowed.analytics === true,
    marketingAllowed: () => allowed.marketing === true,
    saleOfDataAllowed: () => allowed.sale_of_data === true
  };
  const window = {
    Shopify: { customerPrivacy },
    navigator: signals,
    localStorage,
    setTimeout: () => 1,
    clearTimeout: () => {},
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } }
  };
  if (!noLoader) window.Shopify.loadFeatures = (features, callback) => { loadCalls += 1; loadedFeatures = features; callback(loadError); };
  vm.runInNewContext(source, { window, document, Date, Promise, Set, Error, JSON, Number, Array });
  return { window, events, listeners, stored, get loadCalls() { return loadCalls; }, get loadedFeatures() { return loadedFeatures; } };
}

test('requires explicit yes consent and matching Shopify processing permission; withdrawal updates subscribers', async () => {
  const h = harness({ consent: { analytics: 'yes' }, allowed: { analytics: true } });
  await h.window.KGPrivacy.ready;
  assert.equal(h.loadCalls, 1);
  assert.equal(h.loadedFeatures[0].name, config.providers.shopifyCustomerPrivacy.feature.name);
  assert.equal(h.loadedFeatures[0].version, config.providers.shopifyCustomerPrivacy.feature.version);
  assert.equal(h.window.KGPrivacy.allowed('analytics'), true);
  const snapshots = [];
  h.window.KGPrivacy.subscribe((value) => snapshots.push(value.analytics));
  h.window.Shopify.customerPrivacy.currentVisitorConsent = () => ({ analytics: 'no' });
  h.events.visitorConsentCollected();
  assert.equal(h.window.KGPrivacy.allowed('analytics'), false);
  assert.deepEqual(snapshots, [true, false]);
});

test('fails closed for missing loader, loader errors, invalid configuration, thrown methods, and unknown purpose', async () => {
  const missing = harness({ noLoader: true });
  assert.equal(missing.window.KGPrivacy.allowed('preferences'), false);
  const failed = harness({ loadError: new Error('load failed') });
  assert.equal(await failed.window.KGPrivacy.ready, false);
  const invalidConfig = { ...config, recentlyViewed: { maxEntries: 0 } };
  const invalid = harness({ configValue: invalidConfig });
  assert.equal(await invalid.window.KGPrivacy.ready, false);
  const missingProviderFeature = harness({ configValue: { ...config, providers: { shopifyCustomerPrivacy: { feature: { name: '', version: '0.1' } } } } });
  assert.equal(await missingProviderFeature.window.KGPrivacy.ready, false);
  assert.equal(missingProviderFeature.loadCalls, 0);
  const nonPositiveTimeout = harness({ configValue: { ...config, apiLoadTimeoutMs: 0 } });
  assert.equal(await nonPositiveTimeout.window.KGPrivacy.ready, false);
  const broadCleanupPrefix = harness({ configValue: { ...config, storageKeys: { ...config.storageKeys, legacyAnnouncementDismissalPrefix: 'kg_' } } });
  assert.equal(await broadCleanupPrefix.window.KGPrivacy.ready, false);
  const oversizedFeatureName = harness({ configValue: { ...config, providers: { ...config.providers, shopifyCustomerPrivacy: { ...config.providers.shopifyCustomerPrivacy, feature: { ...config.providers.shopifyCustomerPrivacy.feature, name: 'a'.repeat(config.providers.shopifyCustomerPrivacy.feature.nameMaxLength + 1) } } } } });
  assert.equal(await oversizedFeatureName.window.KGPrivacy.ready, false);
  assert.equal(oversizedFeatureName.loadCalls, 0);
  const oversizedFeatureVersion = harness({ configValue: { ...config, providers: { ...config.providers, shopifyCustomerPrivacy: { ...config.providers.shopifyCustomerPrivacy, feature: { ...config.providers.shopifyCustomerPrivacy.feature, version: '1.'.padEnd(config.providers.shopifyCustomerPrivacy.feature.versionMaxLength + 1, '1') } } } } });
  assert.equal(await oversizedFeatureVersion.window.KGPrivacy.ready, false);
  assert.equal(oversizedFeatureVersion.loadCalls, 0);
  const oversizedProviderMetadata = harness({ configValue: { ...config, providers: { ...config.providers, shopifyCustomerPrivacy: { ...config.providers.shopifyCustomerPrivacy, extra: 'x'.repeat(config.providers.shopifyCustomerPrivacy.metadataMaxChars + 1) } } } });
  assert.equal(await oversizedProviderMetadata.window.KGPrivacy.ready, false);
  assert.equal(oversizedProviderMetadata.loadCalls, 0);
  const throwing = harness({ consent: { preferences: 'yes' }, allowed: { preferences: true } });
  await throwing.window.KGPrivacy.ready;
  throwing.window.Shopify.customerPrivacy.preferencesProcessingAllowed = () => { throw new Error('unavailable'); };
  assert.equal(throwing.window.KGPrivacy.allowed('preferences'), false);
  assert.equal(throwing.window.KGPrivacy.allowed('visitor_id'), false);
});

test('DNT and GPC deny analytics, marketing, and data sharing while explicit preferences may remain allowed', async () => {
  for (const signals of [{ doNotTrack: '1' }, { globalPrivacyControl: true }]) {
    const h = harness({ consent: { preferences: 'yes', analytics: 'yes', marketing: 'yes', sale_of_data: 'yes' }, allowed: { preferences: true, analytics: true, marketing: true, sale_of_data: true }, signals });
    await h.window.KGPrivacy.ready;
    assert.equal(h.window.KGPrivacy.allowed('preferences'), true);
    for (const purpose of ['analytics', 'marketing', 'sale_of_data']) assert.equal(h.window.KGPrivacy.allowed(purpose), false);
  }
});

test('bootstrap removes only legacy announcement dismissal keys from the centrally configured prefix', () => {
  const h = harness({ storageEntries: [
    ['kg-announce-old-hash', '1'],
    ['kg-announce-second-message', '1'],
    ['kg_ff_visitor', 'opaque-id'],
    ['unrelated-preference', 'keep']
  ] });
  assert.deepEqual(Array.from(h.stored.keys()), ['kg_ff_visitor', 'unrelated-preference']);
  assert.equal(config.storageKeys.legacyAnnouncementDismissalPrefix, 'kg-announce-');
});
