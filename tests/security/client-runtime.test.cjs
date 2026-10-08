'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const runtimeSource = fs.readFileSync('assets/client-runtime.js', 'utf8');
const config = {
  root: '/ar/',
  predictiveSearchEndpoint: '/ar/search/suggest',
  cartRoutes: { add: '/ar/cart/add.js', cart: '/ar/cart.js', change: '/ar/cart/change.js', update: '/ar/cart/update.js', pantry: '/ar/collections/all' },
  requestTimeoutMs: 25,
  productAddedResetMs: 1400, quickViewCloseMs: 650, cartNoteDebounceMs: 400, collectionFilterDebounceMs: 350,
  maxResponseBytes: 512,
  searchDebounceMs: 250,
  searchMinimumLength: 2,
  maxSearchQueryLength: 120,
  maxSearchResultsPerType: 10,
  maxSearchTypes: 4,
  maxRecommendationResults: 8,
  maxRecentlyViewedRequests: 6,
  maxRecentlyViewedStorageChars: 8192,
  maxProductVariants: 100,
  maxPendingCartWrites: 8,
  maxCartAddItems: 100,
  currency: 'USD',
  demoMode: false,
  groveProductMedia: {},
  cdnHosts: ['cdn.shopify.com', 'kindred-grove.myshopify.com'],
  messages: {
    search: { products: 'Products', pages: 'Pages', articles: 'Articles', collections: 'Collections', noResults: 'No results for {query}.' },
    quickView: { loading: 'Loading', loadError: 'Unavailable', addToCart: 'Add', added: 'Added', soldOut: 'Sold out', viewDetails: 'Details', cartStatusUnknown: 'Check cart' },
    product: { addToCart: 'Add', added: 'Added', soldOut: 'Sold out', cartStatusUnknown: 'Check cart' },
    cart: { statusUnknown: 'Check cart', statusError: 'Error', adding: 'Adding', added: 'Added', emptyTitle: 'Empty', emptyCta: 'Browse', quantity: 'Quantity', quantityControls: 'Quantity controls', decrease: 'Decrease', increase: 'Increase', remove: 'Remove {title}', freeShippingUnlocked: 'Unlocked', freeShippingRemaining: 'Add {amount} more', noteSaving: 'Saving', noteSaved: 'Saved', noteError: 'Error' },
    recommendations: { quickView: 'Quick view' },
    demo: { samplePrice: 'Sample price' },
  },
};

function clientHarness(fetchImpl = async () => response('{}'), configValue = config) {
  const document = { getElementById: () => ({ dataset: { config: JSON.stringify(configValue) } }) };
  const window = { location: { href: 'https://shop.example.test/ar/products/example', origin: 'https://shop.example.test' } };
  vm.runInNewContext(runtimeSource, {
    window, document, fetch: fetchImpl, URL, URLSearchParams, AbortController,
    TextEncoder, TextDecoder, setTimeout, clearTimeout, JSON, Number, Object,
    Array, String, Error, RegExp,
  });
  return window.KGClient;
}

function response(body, { contentType = 'application/json' } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const bytes = new TextEncoder().encode(text);
  let consumed = false;
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    body: {
      getReader: () => ({
        read: async () => {
          if (consumed) return { done: true };
          consumed = true;
          return { done: false, value: bytes };
        },
        cancel: async () => {},
      }),
    },
  };
}

const cartSnapshot = (item_count) => ({
  items: item_count ? [{ key: 'fixture-line', product_id: 1, quantity: item_count, final_line_price: 0 }] : [],
  item_count, total_price: 0, currency: 'USD',
});

test('client URL boundary rejects foreign, executable, credentialed, protocol-relative, and hostile image targets', () => {
  const client = clientHarness();
  for (const input of [
    'https://attacker.example/collect', '//attacker.example/collect',
    'javascript:alert(1)', 'https://user:pass@shop.example.test/a',
    '/safe\nheader', '/ar/products/tea?access_token=test-key',
  ]) assert.equal(client.safeUrl(input), null, input);
  assert.equal(client.safeUrl('/ar/products/example')?.origin, 'https://shop.example.test');
  assert.equal(client.safeUrl('https://cdn.shopify.com/image.webp', { image: true })?.hostname, 'cdn.shopify.com');
  assert.equal(client.safeUrl('//cdn.shopify.com/image.webp', { image: true })?.protocol, 'https:');
  assert.equal(client.safeUrl('//kindred-grove.myshopify.com/cdn/assets/a.png', { image: true })?.hostname, 'kindred-grove.myshopify.com');
  assert.equal(client.safeUrl('//shop.example.test/cdn/assets/a.png', { image: true })?.origin, 'https://shop.example.test');
  assert.equal(client.safeUrl('https://cdn.shopify.com/image.webp'), null);
  assert.equal(client.safeUrl('//attacker.example/image.webp', { image: true }), null);
  assert.equal(client.safeUrl('http://cdn.shopify.com/image.webp', { image: true }), null);
  assert.equal(client.safeUrl('https://user:pass@cdn.shopify.com/image.webp', { image: true }), null);
  assert.equal(client.safeUrl('https://images.example.test/image.webp', { image: true }), null);
  assert.equal(client.productPath('products', 'tea-01'), 'https://shop.example.test/ar/products/tea-01');
  assert.equal(client.productPath('products', '../cart'), null);
  assert.equal(client.productPath('products', 'tea/../../cart'), null);
  assert.equal(client.route('https://attacker.example/x'), null);
  assert.equal(client.route('../cart.js'), null);
  assert.equal(client.route('cart.js'), 'https://shop.example.test/ar/cart.js');
});

test('client boot validates nonempty native media configuration after host policy initialization', () => {
  for (const url of ['//cdn.shopify.com/assets/oil.webp', 'https://cdn.shopify.com/assets/oil.webp', '/cdn/assets/oil.webp']) {
    const client = clientHarness(undefined, { ...config, groveProductMedia: { 'demo-oil': url } });
    assert.equal(client.configValid, true, url);
    assert.ok(client.safeUrl(client.config.groveProductMedia['demo-oil'], { image: true }));
  }
  const rejected = clientHarness(undefined, { ...config, groveProductMedia: { 'demo-oil': '//attacker.example/oil.webp' } });
  assert.equal(rejected.configValid, false);
});

test('invalid or incomplete client configuration fails closed', async () => {
  for (const messages of [null, [], { search: [] }]) {
    const client = clientHarness(undefined, { ...config, messages });
    assert.equal(client.configValid, false);
    await assert.rejects(client.requestJSON('/ar/cart.js'), /configuration is invalid/);
  }
});

test('request helper sends same-origin credentials, rejects redirects, and parses JSON', async () => {
  const seen = [];
  const client = clientHarness(async (url, options) => {
    seen.push({ url, options });
    return response({ ok: true });
  });
  assert.deepEqual(await client.requestJSON('/ar/cart.js'), { ok: true });
  assert.equal(seen[0].options.credentials, 'same-origin');
  assert.equal(seen[0].options.redirect, 'error');
  assert.equal(seen[0].options.method, 'GET');
  await assert.rejects(client.requestJSON('https://attacker.example/data'), /approved same-origin/);
  await assert.rejects(client.requestJSON('/ar/cart/add.js', { method: 'PUT' }), /Only JSON GET and POST/);
  const badJson = clientHarness(async () => response('{', { contentType: 'application/json' }));
  await assert.rejects(badJson.requestJSON('/ar/data'), /not valid JSON/);
  const wrongType = clientHarness(async () => response('{}', { contentType: 'text/html' }));
  await assert.rejects(wrongType.requestJSON('/ar/data'), /did not declare JSON/);

  const externallyAborted = clientHarness((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }));
  const controller = new AbortController();
  const pendingRequest = externallyAborted.requestJSON('/ar/data', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pendingRequest, (error) => error.name === 'AbortError');
});

test('Shopify legacy JavaScript MIME is parsed as JSON only on known JSON routes', async () => {
  const line = { id: 42, key: 'variant-line', quantity: 1 };
  const client = clientHarness(async () => response(line, { contentType: 'text/javascript; charset=utf-8' }));
  let reconciliations = 0;
  const outcome = await client.mutateCart(
    () => client.requestJSON('/ar/cart/add.js', { method: 'POST', body: 'id=42&quantity=1' }),
    async () => { reconciliations += 1; return cartSnapshot(0); },
    client.isAddedItems,
  );
  assert.equal(outcome.ok, true);
  assert.equal(reconciliations, 0);

  const readClient = clientHarness(async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname === '/ar/cart.js') return response(cartSnapshot(0), { contentType: 'text/javascript; charset=utf-8' });
    if (pathname === '/ar/products/example.js') return response({ title: 'Example', variants: [], options: [] }, { contentType: 'text/javascript; charset=utf-8' });
    if (pathname === '/ar/search/suggest.json') return response({ resources: { results: {} } }, { contentType: 'text/javascript; charset=utf-8' });
    if (pathname === '/ar/recommendations/products.json') return response({ products: [] }, { contentType: 'text/javascript; charset=utf-8' });
    return response({}, { contentType: 'text/javascript; charset=utf-8' });
  });
  assert.equal((await readClient.requestJSON('/ar/cart.js')).item_count, 0);
  assert.equal((await readClient.requestJSON('/ar/products/example.js')).title, 'Example');
  await assert.rejects(readClient.requestJSON('/ar/products/example.js', { method: 'POST', body: 'id=42' }), /did not declare JSON/);
  assert.deepEqual(await readClient.requestJSON('/ar/search/suggest.json?q=olive&resources%5Blimit%5D=10&resources%5Blimit_scope%5D=each&resources%5Btype%5D=product%2Cpage&resources%5Boptions%5D%5Bunavailable_products%5D=last'), { resources: { results: {} } });
  assert.deepEqual(await readClient.requestJSON('/ar/recommendations/products.json?product_id=42&limit=4&intent=related'), { products: [] });

  let writes = 0;
  let reads = 0;
  const failedWriteClient = clientHarness(async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname === '/ar/cart/add.js') {
      writes += 1;
      return response({ status: 'bad_request', message: 'invalid item' }, { contentType: 'text/javascript; charset=utf-8' });
    }
    if (pathname === '/ar/cart.js') {
      reads += 1;
      return response(cartSnapshot(0), { contentType: 'text/javascript; charset=utf-8' });
    }
    throw new Error('Unexpected fixture route.');
  });
  const reconciled = await failedWriteClient.mutateCart(
    () => failedWriteClient.requestJSON('/ar/cart/add.js', { method: 'POST', body: 'id=42&quantity=1' }),
    () => failedWriteClient.requestJSON('/ar/cart.js'),
    failedWriteClient.isAddedItems,
  );
  assert.equal(reconciled.ok, false);
  assert.equal(reconciled.reconciled, true);
  assert.equal(reconciled.cart.item_count, 0);
  assert.equal(writes, 1);
  assert.equal(reads, 1);

  const unrelatedMime = clientHarness(async () => response({}, { contentType: 'text/javascript; charset=utf-8' }));
  await assert.rejects(unrelatedMime.requestJSON('/ar/assets/unrelated.js'), /did not declare JSON/);
  await assert.rejects(unrelatedMime.requestJSON('/ar/recommendations/products.json?product_id=42&limit=4&intent=related&extra=1'), /did not declare JSON/);

  const scriptText = clientHarness(async () => response('window.__cartProbeExecuted = true;', { contentType: 'text/javascript; charset=utf-8' }));
  await assert.rejects(scriptText.requestJSON('/ar/cart/add.js', { method: 'POST', body: 'id=42&quantity=1' }), /not valid JSON/);
});

test('request helper caps streamed JSON and times out a stalled response body', async () => {
  const oversized = clientHarness(async () => ({
    ...response(''),
    body: {
      getReader: () => ({ read: async () => ({ done: false, value: new Uint8Array(513) }), cancel: async () => {} }),
    },
  }));
  await assert.rejects(oversized.requestJSON('/ar/data'), /size limit/);

  const stalled = clientHarness(async (_url, options) => {
    let rejectRead;
    const body = {
      getReader: () => ({
        read: () => new Promise((_resolve, reject) => { rejectRead = reject; }),
        cancel: async () => {},
      }),
    };
    options.signal.addEventListener('abort', () => rejectRead(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    return { ok: true, headers: { get: (name) => name === 'content-type' ? 'application/json' : null }, body };
  });
  await assert.rejects(stalled.requestJSON('/ar/data'), (error) => error.name === 'AbortError');
});

test('request helper aborts rejected responses and fails closed when no bounded stream exists', async () => {
  for (const rejected of [
    { ok: false, status: 500, headers: { get: () => 'application/json' }, body: { getReader: () => { throw new Error('must not read'); } } },
    { ok: true, status: 200, headers: { get: () => 'text/html' }, body: { getReader: () => { throw new Error('must not read'); } } },
    { ok: true, status: 200, headers: { get: (name) => name === 'content-type' ? 'application/json' : name === 'content-length' ? '999999' : null }, body: { getReader: () => { throw new Error('must not read'); } } },
  ]) {
    let aborted = false;
    const client = clientHarness(async (_url, options) => {
      options.signal.addEventListener('abort', () => { aborted = true; });
      return rejected;
    });
    await assert.rejects(client.requestJSON('/ar/cart.js'));
    assert.equal(aborted, true);
  }
  const unbounded = clientHarness(async () => ({ ok: true, headers: { get: () => 'application/json' }, text: async () => '{}' }));
  await assert.rejects(unbounded.requestJSON('/ar/cart.js'), /streaming is unavailable/);
});

test('cart writes serialize, reconcile uncertain outcomes, and block until a fresh cart read succeeds', async () => {
  const client = clientHarness();
  const order = [];
  let releaseWrite;
  const first = client.mutateCart(
    () => new Promise((_resolve, reject) => { releaseWrite = () => reject(new Error('private transport detail')); }),
    async () => { order.push('reconcile'); throw new Error('private read detail'); },
  );
  const second = client.mutateCart(async () => { order.push('second-write'); return 'written'; }, async () => cartSnapshot(1));
  await new Promise((resolve) => setImmediate(resolve));
  releaseWrite();
  const firstResult = await first;
  const secondResult = await second;
  assert.deepEqual(order, ['reconcile']);
  assert.equal(firstResult.ok, false);
  assert.equal(firstResult.reconciled, false);
  assert.equal(secondResult.blocked, true);
  assert.equal(client.cartWritesBlocked(), true);

  const fresh = await client.readCart(async () => cartSnapshot(2));
  assert.equal(fresh.item_count, 2);
  assert.equal(client.cartWritesBlocked(), false);
  const afterRefresh = await client.mutateCart(async () => 'ok', async () => cartSnapshot(3));
  assert.equal(afterRefresh.ok, true);
  assert.equal(afterRefresh.data, 'ok');
});

test('cart coordinator reconciles a failed write before releasing queued writes and never retries it', async () => {
  const client = clientHarness();
  const order = [];
  const uncertain = client.mutateCart(async () => { order.push('write-once'); throw new Error('timeout'); }, async () => {
    order.push('fresh-cart');
    return cartSnapshot(1);
  });
  const next = client.mutateCart(async () => { order.push('stale-queued-write'); return 'ok'; }, async () => cartSnapshot(1));
  const uncertainResult = await uncertain;
  const nextResult = await next;
  assert.equal(uncertainResult.ok, false);
  assert.equal(uncertainResult.reconciled, true);
  assert.equal(uncertainResult.cart.item_count, 1);
  assert.equal(nextResult.ok, false);
  assert.equal(nextResult.blocked, true);
  assert.deepEqual(order, ['write-once', 'fresh-cart']);
  const fresh = await client.readCart(async () => cartSnapshot(2));
  assert.equal(fresh.item_count, 2);
  const explicitAction = await client.mutateCart(async () => 'ok', async () => cartSnapshot(3));
  assert.equal(explicitAction.ok, true);
});

test('cart coordinator rejects malformed cart snapshots and bounds queued writes', async () => {
  const malformed = clientHarness();
  const uncertain = await malformed.mutateCart(async () => { throw new Error('timeout'); }, async () => ({}));
  assert.equal(uncertain.reconciled, false);
  assert.equal(malformed.cartWritesBlocked(), true);
  await assert.rejects(malformed.readCart(async () => ({ items: [], item_count: 1, total_price: 0, currency: 'USD' })), /snapshot was invalid/);
  assert.equal(malformed.cartWritesBlocked(), true);
  await malformed.readCart(async () => cartSnapshot(0));
  assert.equal(malformed.cartWritesBlocked(), false);

  const bounded = clientHarness(undefined, { ...config, maxPendingCartWrites: 1 });
  let release;
  const active = bounded.mutateCart(() => new Promise((resolve) => { release = resolve; }), async () => cartSnapshot(0));
  await new Promise((resolve) => setImmediate(resolve));
  const queued = bounded.mutateCart(async () => 'queued', async () => cartSnapshot(0));
  const overflow = await bounded.mutateCart(async () => 'should not run', async () => cartSnapshot(0));
  assert.equal(overflow.blocked, true);
  release('active');
  assert.equal((await active).ok, true);
  assert.equal((await queued).ok, true);
});

test('malformed successful Shopify add payload is treated as uncertain and reconciled, not announced', async () => {
  const client = clientHarness();
  let writes = 0;
  const outcome = await client.mutateCart(
    async () => { writes += 1; return { items: [] }; },
    async () => cartSnapshot(1),
    client.isAddedItems,
  );
  assert.equal(writes, 1);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reconciled, true);
  assert.equal(outcome.cart.item_count, 1);
  const malformedChange = await client.mutateCart(async () => ({ items: [], item_count: 0 }), async () => cartSnapshot(1), client.isCartSnapshot);
  assert.equal(malformedChange.ok, false);
  assert.equal(malformedChange.reconciled, true);
});

test('Shopify cart add validator accepts a single line or nonempty items envelope without reconciling', async () => {
  const client = clientHarness();
  const line = { id: 42, key: 'variant-line', quantity: 1 };
  assert.equal(client.isAddedItems(line), true);
  assert.equal(client.isAddedItems({ ...line, key: 43 }), true);
  assert.equal(client.isAddedItems({ items: [line] }), true);
  assert.equal(client.isAddedItems({ items: [line, { ...line, key: 'second-line' }] }), true);

  let reconciliations = 0;
  const direct = await client.mutateCart(async () => line, async () => {
    reconciliations += 1;
    return cartSnapshot(0);
  }, client.isAddedItems);
  assert.equal(direct.ok, true);
  assert.equal(direct.reconciled, undefined);
  assert.equal(reconciliations, 0);

  for (const invalid of [
    { items: [] }, { items: [{}] }, { status: 422, description: 'invalid' },
    { ...line, items: {} }, { ...line, quantity: 0 }, { ...line, id: '42' },
    { ...line, key: '' }, { ...line, key: 0 }, { ...line, key: -1 }, [], null,
  ]) assert.equal(client.isAddedItems(invalid), false);

  let malformedReconciliations = 0;
  const malformed = await client.mutateCart(async () => ({ items: [{}] }), async () => {
    malformedReconciliations += 1;
    return cartSnapshot(1);
  }, client.isAddedItems);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.reconciled, true);
  assert.equal(malformedReconciliations, 1);
});

test('predictive search aborts superseded requests, rejects stale results, clears short input, and reconnects once', async () => {
  const pending = [];
  let Component;
  class FakeInput {
    constructor() { this.value = ''; this.listeners = new Map(); this.attributes = {}; }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    removeEventListener(name, listener) { if (this.listeners.get(name) === listener) this.listeners.delete(name); }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    blur() {}
  }
  class FakeResults {
    constructor() { this.hidden = true; this.html = ''; }
    set innerHTML(value) { this.html = value; }
    get innerHTML() { return this.html; }
    replaceChildren() { this.html = ''; }
    querySelectorAll() { return []; }
  }
  class HTMLElement {
    constructor() {
      this.attrs = { 'data-endpoint': '/ar/search/suggest', 'data-types': 'product,page,article', 'data-limit': '3' };
      this.input = new FakeInput();
      this.results = new FakeResults();
      this.listeners = new Map();
      this.isConnected = true;
    }
    getAttribute(name) { return this.attrs[name] ?? null; }
    querySelector(selector) { return selector === '[data-kg-search-input]' ? this.input : this.results; }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    removeEventListener(name, listener) { if (this.listeners.get(name) === listener) this.listeners.delete(name); }
    contains() { return true; }
  }
  const customElements = { get: () => null, define: (_name, value) => { Component = value; } };
  const document = {
    getElementById: () => ({ dataset: { config: JSON.stringify(config) } }),
    documentElement: { lang: 'en' },
  };
  const window = { location: { href: 'https://shop.example.test/ar/search', origin: 'https://shop.example.test' } };
  vm.runInNewContext(fs.readFileSync('assets/client-runtime.js', 'utf8'), {
    window, document, fetch: (_url, options) => new Promise((resolve) => pending.push({ resolve, options })),
    URL, URLSearchParams, AbortController, TextEncoder, TextDecoder, setTimeout, clearTimeout,
    JSON, Number, Object, Array, String, Error, RegExp, Math, HTMLElement, customElements,
  });
  vm.runInNewContext(fs.readFileSync('assets/predictive-search.js', 'utf8'), {
    window, document, HTMLElement, customElements, URL, URLSearchParams, AbortController,
    setTimeout, clearTimeout, JSON, Number, Object, Array, String, Error, RegExp, Math,
  });
  const search = new Component();
  search.connectedCallback();
  const oldRequest = search._search('older');
  const newRequest = search._search('newer');
  assert.equal(pending[0].options.signal.aborted, true);
  pending[1].resolve(response({ resources: { results: { products: [{ title: 'Fresh result', url: '/ar/products/fresh' }] } } }));
  await newRequest;
  pending[0].resolve(response({ resources: { results: { products: [{ title: 'Stale result', url: '/ar/products/stale' }] } } }));
  await oldRequest;
  assert.match(search.results.innerHTML, /Fresh result/);
  assert.doesNotMatch(search.results.innerHTML, /Stale result/);

  search.input.value = 'x';
  search._onInput();
  assert.equal(search.results.innerHTML, '');
  assert.equal(search.results.hidden, true);
  assert.equal(search.input.attributes['aria-expanded'], 'false');
  search.disconnectedCallback();
  assert.equal(search.input.listeners.size, 0);
  assert.equal(search.listeners.size, 0);
  search.isConnected = true;
  search.connectedCallback();
  assert.equal(search.input.listeners.size, 2);
  assert.equal(search.listeners.size, 1);
  search.disconnectedCallback();
});

test('recommendations abort stale reads on disconnect and safely render after reconnect', async () => {
  const pending = [];
  let Component;
  class HTMLElement {
    constructor() {
      this.attrs = { 'data-product-id': '42', 'data-max': '4', 'data-intent': 'related' };
      this.grid = { html: '', set innerHTML(value) { this.html = value; } };
      this.isConnected = true;
      this.removed = false;
    }
    getAttribute(name) { return this.attrs[name] ?? null; }
    querySelector() { return this.grid; }
    remove() { this.removed = true; this.isConnected = false; }
  }
  const customElements = { get: () => null, define: (_name, value) => { Component = value; } };
  const document = { getElementById: () => ({ dataset: { config: JSON.stringify(config) } }) };
  const window = { location: { href: 'https://shop.example.test/ar/products/current', origin: 'https://shop.example.test' } };
  vm.runInNewContext(fs.readFileSync('assets/client-runtime.js', 'utf8'), {
    window, document, fetch: (_url, options) => new Promise((resolve) => pending.push({ resolve, options })),
    URL, URLSearchParams, AbortController, TextEncoder, TextDecoder, setTimeout, clearTimeout,
    JSON, Number, Object, Array, String, Error, RegExp, Math, HTMLElement, customElements,
  });
  vm.runInNewContext(fs.readFileSync('assets/recommendations.js', 'utf8'), {
    window, document, HTMLElement, customElements, URL, URLSearchParams, AbortController,
    setTimeout, clearTimeout, JSON, Number, Object, Array, String, Error, RegExp, Math,
  });
  const component = new Component();
  component.connectedCallback();
  component.disconnectedCallback();
  assert.equal(pending[0].options.signal.aborted, true);
  pending[0].resolve(response({ products: [{ handle: 'stale', title: 'Stale product' }] }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(component.grid.html, '');

  component.isConnected = true;
  component.connectedCallback();
  pending[1].resolve(response({ products: [{
    handle: 'fresh-product', title: '<Fresh>', url: 'https://attacker.example/product', price: 1299,
    featured_image: 'https://cdn.shopify.com/image.webp',
  }] }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(component.grid.html, /Fresh/);
  assert.doesNotMatch(component.grid.html, /attacker\.example|<Fresh>/);
  assert.match(component.grid.html, /cdn\.shopify\.com\/image\.webp/);
});

test('quick view image sources and title attributes pass through the shared URL and HTML boundaries', () => {
  let Component;
  class HTMLElement {}
  const customElements = { get: () => null, define: (_name, value) => { Component = value; } };
  const document = { getElementById: () => ({ dataset: { config: JSON.stringify(config) } }) };
  const window = { location: { href: 'https://shop.example.test/ar/products/current', origin: 'https://shop.example.test' } };
  const globals = { window, document, HTMLElement, customElements, URL, URLSearchParams, AbortController,
    TextEncoder, TextDecoder, setTimeout, clearTimeout, JSON, Number, Object, Array, String, Error, RegExp, Math };
  vm.runInNewContext(fs.readFileSync('assets/client-runtime.js', 'utf8'), globals);
  vm.runInNewContext(fs.readFileSync('assets/quick-view.js', 'utf8'), globals);
  const component = new Component();
  assert.equal(component._imageMarkup('javascript:alert(1)', 'bad'), '');
  const image = component._imageMarkup('https://cdn.shopify.com/example.webp', '" onerror="alert(1)');
  assert.match(image, /src="https:\/\/cdn\.shopify\.com\/example\.webp"/);
  assert.match(image, /alt="&quot; onerror=&quot;alert\(1\)"/);
  assert.doesNotMatch(image, /<svg|onerror="alert/);
});

test('client config template keeps runtime controls and locale messages in escaped non-script data', () => {
  const liquid = fs.readFileSync('snippets/client-config.liquid', 'utf8');
  assert.match(liquid, /id="kg-client-config" data-config="\{\{ kg_client_config \| strip \| escape \}\}"/);
  assert.match(liquid, /"root": \{\{ routes\.root_url \| json \}\}/);
  assert.match(liquid, /"requestTimeoutMs": 7000/);
  assert.match(liquid, /'client\.quick_view\.cart_status_unknown' \| t/);
  assert.doesNotMatch(liquid, /<script/i);
});

 test('UI timing policy is supplied by configuration and rejects malformed durations', () => {
  const fields = ['productAddedResetMs', 'quickViewCloseMs', 'cartNoteDebounceMs', 'collectionFilterDebounceMs'];
  for (const field of fields) {
    const configured = clientHarness(undefined, { ...config, [field]: 321 });
    assert.equal(configured.configValid, true);
    assert.equal(configured.limits[field], 321);
    for (const value of [undefined, 0, -1, 1.2, '321']) {
      assert.equal(clientHarness(undefined, { ...config, [field]: value }).configValid, false);
    }
  }
});

test('client locale placeholder arguments use captured values accepted by native Liquid upload', () => {
  const source = fs.readFileSync('snippets/client-config.liquid', 'utf8');
  assert.doesNotMatch(source, /\|\s*t:[^\n]+:\s*['"]\{/);
  for (const name of ['query', 'title', 'amount']) {
    assert.ok(source.includes(`capture kg_${name}_placeholder`));
    assert.ok(source.includes(`: kg_${name}_placeholder`));
  }
});
