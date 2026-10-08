const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = (file) => fs.readFileSync(file, 'utf8');

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    values
  };
}

function runFlags({ allowed, store = storage(), search = '' }) {
  const events = [];
  const elements = {
    'kg-feature-flags-config': { dataset: { json: '[{"name":"hero","default":false,"variants":[false,true]}]' } }
  };
  const window = {
    KGPrivacy: { configValid: true, config: JSON.parse(read('snippets/privacy-config.liquid').match(/\{%- capture kg_privacy_config -%\}([\s\S]*?)\{%- endcapture -%\}/)[1]), allowed: (purpose) => purpose === 'analytics' && allowed, ready: Promise.resolve(true), subscribe(fn) { this.listener = fn; } },
    localStorage: store, location: { search }, URLSearchParams, Math, crypto: { randomUUID: () => 'test-id' },
    CustomEvent: class { constructor(type) { this.type = type; } }, dispatchEvent: (event) => events.push(event)
  };
  vm.runInNewContext(read('assets/feature-flags.js'), { window, document: { getElementById: (id) => elements[id] }, Promise, URLSearchParams, Math, JSON, Array, Object, String });
  return { window, events };
}

test('feature flags use defaults and remove owned A/B state without analytics; analytics consent enables assignment persistence', async () => {
  const seed = { kg_ff_visitor: 'old-id', kg_ff_assignments: '{"hero":true}', 'kg_ff_override:hero': 'true', keep: 'merchant' };
  const deniedStore = storage(seed);
  const denied = runFlags({ allowed: false, store: deniedStore, search: '?kg_ff=hero,true' });
  await denied.window.KG_FF.ready;
  assert.equal(denied.window.KG_FF.get('hero'), false);
  assert.equal(deniedStore.getItem('kg_ff_visitor'), null);
  assert.equal(deniedStore.getItem('kg_ff_assignments'), null);
  assert.equal(deniedStore.getItem('kg_ff_override:hero'), null);
  assert.equal(deniedStore.getItem('keep'), 'merchant');
  assert.equal(deniedStore.values.has('__kg_preferences_probe__'), false);

  const grantedStore = storage();
  const granted = runFlags({ allowed: true, store: grantedStore });
  await granted.window.KG_FF.ready;
  granted.window.KG_FF.get('hero');
  assert.equal(grantedStore.getItem('kg_ff_visitor'), 'test-id');
  assert.ok(grantedStore.getItem('kg_ff_assignments'));
  assert.equal(granted.events.length, 1);
});

test('feature flags tolerate blocked storage without sending telemetry', async () => {
  const validConfig = JSON.parse(read('snippets/privacy-config.liquid').match(/\{%- capture kg_privacy_config -%\}([\s\S]*?)\{%- endcapture -%\}/)[1]);
  validConfig.featureFlags.defaultRollout = 0;
  const window = { get localStorage() { throw new Error('blocked'); }, KGPrivacy: { configValid: true, config: validConfig, allowed: () => true, ready: Promise.resolve(true), subscribe() {} }, location: { search: '' }, URLSearchParams, Math, CustomEvent: class {}, dispatchEvent() {} };
  vm.runInNewContext(read('assets/feature-flags.js'), { window, document: { getElementById: () => ({ dataset: { json: '[{"name":"hero","default":false}]' } }) }, Promise, URLSearchParams, Math, JSON, Array, Object, String });
  await window.KG_FF.ready;
  assert.equal(window.KG_FF.get('hero'), false);
});

test('merchant JSON is carried in escaped template attributes, not executable script raw text', () => {
  const layout = read('layout/theme.liquid');
  const quiz = read('blocks/pantry-quiz.liquid');
  assert.match(layout, /<template id="kg-feature-flags-config" data-json="\{\{ settings\.feature_flags_json[^\n]+\| escape/);
  for (const [name, raw, attribute, localeKey] of [
    ['questions', 'questions_raw', 'questions_json_attribute', 'quiz.default_questions_json'],
    ['personas', 'personas_raw', 'personas_json_attribute', 'quiz.default_personas_json'],
  ]) {
    assert.match(quiz, new RegExp(`assign ${raw} = block\\.settings\\.\\w+`));
    assert.match(quiz, new RegExp(`assign ${attribute} = ${raw} \\| escape(?:\\n|\\r)`), `${name} merchant JSON must be HTML-escaped`);
    assert.match(quiz, new RegExp(`assign ${raw} = '${localeKey}' \\| t`), `${name} defaults must use the localized payload`);
    assert.match(quiz, new RegExp(`assign ${attribute} = ${raw} \\| escape_once`), `${name} translated JSON must be escaped once`);
    assert.match(quiz, new RegExp(`<template data-kg-quiz-${name} data-json=\"\\{\\{ ${attribute} \\}\\}`));
  }
  assert.match(quiz, /<template data-kg-quiz-scoring data-json="\{\{ block\.settings\.scoring_json \| escape \}\}/);
  assert.doesNotMatch(layout, /__KG_FF_DEFS__|sentry\.io|web-vitals/);
  assert.doesNotMatch(read('assets/theme.js'), /Sentry|gtag|dataLayer|fetch\s*\(/);
  const hostile = '</template><script>window.pwned=true<\/script><template>';
  const escaped = hostile.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const decodedAttribute = escaped.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  assert.equal(JSON.parse(JSON.stringify(decodedAttribute)), hostile);
  assert.match(read('assets/pantry-quiz.js'), /JSON\.parse\(raw\)/);
  assert.match(read('assets/pantry-quiz.js'), /element\.dataset\.json \|\| element\.dataset\.config/);
});

test('quiz keeps answers in memory and never restores or persists the legacy session key', () => {
  const quiz = read('assets/pantry-quiz.js');
  assert.match(quiz, /this\.answers = \[\];/);
  assert.match(quiz, /sessionStorage\.removeItem\(key\)/);
  assert.doesNotMatch(quiz, /sessionStorage\.(getItem|setItem)\s*\(/);
  assert.doesNotMatch(quiz, /Sentry|gtag|dataLayer|visitor_id|_reportComplete/);
});

test('recently viewed clears on preference denial and only fetches same-origin product JSON with consent', async () => {
  let Component;
  class FakeHTMLElement {
    constructor() { this.attrs = {}; this.childGrid = { innerHTML: '', replaceChildren() { this.innerHTML = ''; } }; this.isConnected = true; }
    querySelector() { return this.childGrid; }
    getAttribute(name) { return this.attrs[name] ?? null; }
    setAttribute(name, value) { this.attrs[name] = value; }
    removeAttribute(name) { delete this.attrs[name]; }
  }
  const customElements = { get: () => null, define: (_name, type) => { Component = type; } };
  const runRecent = async (preferences) => {
    const store = storage({ 'kg:recently-viewed': JSON.stringify([{ handle: 'test-item', title: 'Test item', ts: Date.now() - 3600000 }]) });
    const requests = [];
    const pending = [];
    let allowPreferences = preferences;
    let privacyListener = null;
    const privacy = {
      configValid: true,
      config: JSON.parse(read('snippets/privacy-config.liquid').match(/\{%- capture kg_privacy_config -%\}([\s\S]*?)\{%- endcapture -%\}/)[1]),
      allowed: (purpose) => purpose === 'preferences' && allowPreferences,
      ready: Promise.resolve(true),
      subscribe(fn) { privacyListener = fn; fn({ preferences: allowPreferences }); return () => {}; }
    };
    const clientConfig = {
      root: '/', predictiveSearchEndpoint: '/search/suggest',
      cartRoutes: { add: '/cart/add.js', cart: '/cart.js', change: '/cart/change.js', update: '/cart/update.js', pantry: '/collections/all' },
      requestTimeoutMs: 500,
  productAddedResetMs: 1400, quickViewCloseMs: 650, cartNoteDebounceMs: 400, collectionFilterDebounceMs: 350,
      maxResponseBytes: 32768, searchDebounceMs: 250, searchMinimumLength: 2,
      maxSearchQueryLength: 120, maxSearchResultsPerType: 10, maxSearchTypes: 4, maxRecommendationResults: 8,
      maxRecentlyViewedRequests: 6, maxRecentlyViewedStorageChars: 8192, maxProductVariants: 100,
      maxPendingCartWrites: 8, maxCartAddItems: 100, currency: 'USD', demoMode: false, groveProductMedia: {},
      cdnHosts: ['cdn.shopify.com'], messages: {
        search: { products: 'Products', pages: 'Pages', articles: 'Articles', collections: 'Collections', noResults: 'No results {query}' },
        quickView: { loading: 'Loading', loadError: 'Error', addToCart: 'Add', added: 'Added', soldOut: 'Sold out', viewDetails: 'Details', cartStatusUnknown: 'Check cart' },
        product: { addToCart: 'Add', added: 'Added', soldOut: 'Sold out', cartStatusUnknown: 'Check cart' },
        cart: { statusUnknown: 'Check cart', statusError: 'Error', adding: 'Adding', added: 'Added', emptyTitle: 'Empty', emptyCta: 'Browse', quantity: 'Quantity', quantityControls: 'Quantity controls', decrease: 'Decrease', increase: 'Increase', remove: 'Remove {title}', freeShippingUnlocked: 'Unlocked', freeShippingRemaining: 'Add {amount} more', noteSaving: 'Saving', noteSaved: 'Saved', noteError: 'Error' },
        recommendations: { quickView: 'Quick view' },
        demo: { samplePrice: 'Sample price' },
      },
    };
    const runtimeDocument = { getElementById: () => ({ dataset: { config: JSON.stringify(clientConfig) } }) };
    const fetchImpl = (url, options) => {
      requests.push(url);
      return new Promise((resolve) => pending.push({ resolve, signal: options.signal }));
    };
    const window = { KGPrivacy: privacy, localStorage: store, Shopify: { routes: { root: '/' }, currency: { active: 'USD' } }, location: { href: 'https://shop.example.test/products/current', origin: 'https://shop.example.test' } };
    const context = { window, document: runtimeDocument, HTMLElement: FakeHTMLElement, customElements, fetch: fetchImpl, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder, setTimeout, clearTimeout, Promise, Date, Number, String, Array, JSON, encodeURIComponent, Math, Object, RegExp };
    vm.runInNewContext(read('assets/client-runtime.js'), context);
    vm.runInNewContext(read('assets/recently-viewed.js'), context);
    const component = new Component();
    await component.connectedCallback();
    await new Promise((resolve) => setImmediate(resolve));
    return {
      store, requests, pending, component,
      resolveRequest(index) {
        const body = JSON.stringify({ handle: 'test-item', title: 'Test item', price: 1250 });
        const bytes = new TextEncoder().encode(body);
        let consumed = false;
        pending[index].resolve({ ok: true, headers: { get: (name) => name === 'content-type' ? 'application/json' : null }, body: { getReader: () => ({ read: async () => {
          if (consumed) return { done: true };
          consumed = true;
          return { done: false, value: bytes };
        }, cancel: async () => {} }) } });
      },
      disconnect() { component.isConnected = false; component.disconnectedCallback(); },
      async reconnect() { component.isConnected = true; await component.connectedCallback(); await new Promise((resolve) => setImmediate(resolve)); },
      withdraw() { allowPreferences = false; privacyListener({ preferences: false }); },
    };
  };
  const denied = await runRecent(false);
  assert.equal(denied.store.getItem('kg:recently-viewed'), null);
  assert.deepEqual(denied.requests, []);
  const allowed = await runRecent(true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(allowed.requests.length, 1);
  assert.equal(new URL(allowed.requests[0]).pathname, '/products/test-item.js');
  allowed.disconnect();
  assert.equal(allowed.pending[0].signal.aborted, true);
  allowed.resolveRequest(0);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(allowed.component.childGrid.innerHTML, '');
  await allowed.reconnect();
  assert.equal(allowed.requests.length, 2);
  allowed.resolveRequest(1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(allowed.component.childGrid.innerHTML, /Test item/);
  allowed.withdraw();
  assert.equal(allowed.store.getItem('kg:recently-viewed'), null);
  assert.equal(allowed.component.hasAttribute ? allowed.component.hasAttribute('hidden') : allowed.component.attrs.hidden, '');
});
