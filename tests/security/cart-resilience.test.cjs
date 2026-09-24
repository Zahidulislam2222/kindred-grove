'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = (path) => fs.readFileSync(path, 'utf8');

test('cart, product, and Grove writes share KGClient and never bypass its transport or log errors', () => {
  for (const path of ['assets/cart-drawer.js', 'assets/product-form.js', 'assets/quick-view.js']) {
    const source = read(path);
    assert.doesNotMatch(source, /\bfetch\s*\(|Sentry/i, path);
    assert.match(source, /mutateCart\s*\(/, path);
  }
  const grove = read('assets/grove.js');
  const cartAddItems = grove.slice(grove.indexOf('async function addItems'), grove.indexOf('class GroveHeader'));
  assert.doesNotMatch(cartAddItems, /\bfetch\s*\(|Sentry/i);
  assert.match(cartAddItems, /mutateCart\s*\(/);
  assert.match(read('assets/cart-drawer.js'), /readCart\s*\(/);
  assert.match(read('assets/quick-view.js'), /readCart\s*\(/);
});

test('cart line renderer escapes hostile text and rejects hostile navigation and image URLs', () => {
  let CartDrawer;
  class HTMLElement {}
  const customElements = { get: () => null, define: (_name, component) => { CartDrawer = component; } };
  const window = {
    KGClient: {
      config: { groveProductMedia: {}, currency: 'USD', messages: { cart: { quantityControls: 'Quantity controls', decrease: 'Decrease', increase: 'Increase', quantity: 'Quantity', remove: 'Remove {title}' } } },
      safeUrl(raw, { image = false } = {}) {
        try {
          const url = new URL(raw, 'https://shop.example.test/');
          if (url.protocol !== 'https:' || (!image && url.origin !== 'https://shop.example.test')
            || (image && !['shop.example.test', 'cdn.shopify.com'].includes(url.hostname))) return null;
          return url;
        } catch (_error) { return null; }
      },
    },
  };
  const document = {};
  vm.runInNewContext(read('assets/cart-drawer.js'), { window, document, HTMLElement, customElements, Object, URL, String, Number, Math, JSON });
  const mount = { innerHTML: '' };
  const instance = Object.create(CartDrawer.prototype);
  instance.querySelector = () => mount;
  instance._t = (key) => ({ quantityControls: 'Quantity controls', decrease: 'Decrease', increase: 'Increase', quantity: 'Quantity', remove: 'Remove {title}' })[key] || '';
  instance._money = () => 'USD 1.00';
  instance._imgUrl = CartDrawer.prototype._imgUrl;
  instance._escape = CartDrawer.prototype._escape;
  instance._attr = CartDrawer.prototype._attr;
  instance._renderLines({ item_count: 1, currency: 'USD', items: [{
    key: 'line-1', product_id: 42, quantity: 1, final_line_price: 100,
    product_title: '<img src=x onerror=alert(1)>', variant_title: 'Default Title',
    url: 'javascript:alert(1)', image: 'https://attacker.example/pixel', handle: 'tea',
  }] });
  assert.match(mount.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(mount.innerHTML, /href="javascript:|src="https:\/\/attacker/);
  assert.doesNotMatch(mount.innerHTML, /<img src=x onerror/);
});

test('configuration and variant payloads use escaped non-script templates; demo prices are labeled centrally', () => {
  assert.match(read('snippets/grove-config.liquid'), /<template id="GroveConfig" data-config="\{\{ kg_grove_config \| strip \| escape \}\}"><\/template>/);
  assert.doesNotMatch(read('snippets/grove-config.liquid'), /<script[^>]+application\/json/);
  assert.match(read('blocks/variant-picker.liquid'), /<template data-kg-variants data-config="\{\{ product\.variants \| json \| escape \}\}"><\/template>/);
  assert.doesNotMatch(read('blocks/variant-picker.liquid'), /<script[^>]+application\/json/);
  for (const path of ['assets/predictive-search.js', 'assets/recommendations.js', 'assets/recently-viewed.js', 'assets/quick-view.js']) {
    assert.match(read(path), /messages\.demo\.samplePrice/, path);
  }
  assert.match(read('snippets/client-config.liquid'), /"demoMode": \{\{ settings\.demo_mode \| json \}\}/);
  assert.match(read('snippets/client-config.liquid'), /"cart": \{\{ routes\.cart_url \| append: '\.js' \| json \}\}/);
  assert.match(read('snippets/client-config.liquid'), /"cdnHosts": \["cdn\.shopify\.com", \{\{ shop\.permanent_domain \| json \}\}\]/);
  assert.match(read('snippets/client-config.liquid'), /"maxCartAddItems": 100/);
  assert.match(read('blocks/product-atc.liquid'), /client\.quick_view\.add_to_cart/);
});

test('demo checkout stays visibly disabled in cart drawer markup', () => {
  const source = read('blocks/cart-drawer.liquid');
  assert.match(source, /if settings\.demo_mode[\s\S]*data-demo-checkout disabled aria-disabled="true"[\s\S]*demo\.checkout_disabled/);
});

test('free-shipping progress requires verified policy, hides in demo/mismatched currencies, and validates thresholds', () => {
  const liquid = read('blocks/cart-free-ship-bar.liquid');
  assert.match(liquid, /settings\.demo_mode != true and block\.settings\.shipping_policy_verified/);
  assert.match(liquid, /threshold_cents > 0 and threshold_cents == threshold_floor and threshold_cents <= 9007199254740991/);
  assert.match(liquid, /cart\.currency\.iso_code == shop\.currency/);
  assert.match(liquid, /data-threshold-currency="\{\{ shop\.currency \| escape \}\}"/);
  assert.match(liquid, /assign remaining_formatted = remaining \| money[\s\S]*assign remaining_message = 'cart\.freeship\.remaining_html' \| t: amount: remaining_formatted/);
  assert.doesNotMatch(liquid, /'cart\.freeship\.remaining_html' \| t:[^\n]*\| money/);

  let CartDrawer;
  class HTMLElement {}
  const customElements = { get: () => null, define: (_name, component) => { CartDrawer = component; } };
  const window = { KGClient: { config: { currency: 'USD' } } };
  const document = {
    createTextNode: (textContent) => ({ textContent }),
    createElement: () => ({ textContent: '', className: '' }),
  };
  vm.runInNewContext(read('assets/cart-drawer.js'), { window, document, HTMLElement, customElements, Object, URL, String, Number, Math, JSON });
  const fill = { style: {} };
  const track = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const message = { children: [], textContent: '', replaceChildren(...children) { this.children = children; } };
  const bar = {
    hidden: true,
    attrs: { 'data-threshold-cents': '7500', 'data-threshold-currency': 'USD' },
    getAttribute(name) { return this.attrs[name] ?? null; },
    querySelector(selector) { return selector === '[data-kg-freeship-fill]' ? fill : selector === '[data-kg-freeship-msg]' ? message : track; },
  };
  const instance = Object.create(CartDrawer.prototype);
  instance.querySelector = () => bar;
  instance._t = (key) => key === 'freeShippingRemaining' ? 'Add {amount} more' : 'Free shipping unlocked';
  instance._money = (amount) => `USD ${amount}`;

  instance._renderFreeShip({ currency: 'USD', total_price: 2000 });
  assert.equal(bar.hidden, false);
  assert.equal(fill.style.width, '27%');
  assert.equal(track.attributes['aria-valuenow'], '27');
  assert.equal(message.children[1].textContent, 'USD 5500');

  instance._renderFreeShip({ currency: 'CAD', total_price: 8000 });
  assert.equal(bar.hidden, true);
  bar.attrs['data-threshold-cents'] = '7500.5';
  instance._renderFreeShip({ currency: 'USD', total_price: 8000 });
  assert.equal(bar.hidden, true);
});

test('predictive search formats Shopify major-unit prices without cart cents conversion', () => {
  let Search;
  class HTMLElement {}
  const customElements = { get: () => null, define: (_name, component) => { Search = component; } };
  const window = { KGClient: { config: { currency: 'USD' } } };
  const document = { documentElement: { lang: 'en-US' } };
  vm.runInNewContext(read('assets/predictive-search.js'), {
    window, document, HTMLElement, customElements, Intl, Number, String, RegExp,
  });
  const instance = Object.create(Search.prototype);
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  assert.equal(instance._money('19.95'), formatter.format(19.95));
  assert.equal(instance._money('20.00'), formatter.format(20));
  assert.equal(instance._money('20'), formatter.format(20));
  for (const value of ['-1.00', '1e3', 'NaN', '1.999', '<img>']) assert.equal(instance._money(value), '', value);
});
