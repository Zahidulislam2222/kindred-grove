const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('retired Worker returns 410 without inspecting inputs or making requests', async () => {
  const source = read('scripts/wholesale-draft-order-worker.js');
  const workerModule = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const worker = workerModule.default;
  const forbiddenAccess = new Proxy({}, {
    get() { throw new Error('input was inspected'); },
    ownKeys() { throw new Error('input was inspected'); },
  });
  const originalFetch = global.fetch;
  global.fetch = () => { throw new Error('outbound request attempted'); };

  try {
    const response = await worker.fetch(forbiddenAccess, forbiddenAccess);
    assert.equal(response.status, 410);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /retired/i);
  } finally {
    global.fetch = originalFetch;
  }
});

test('wholesale block retains native contact and removes proxy and Klaviyo settings', () => {
  const liquid = read('blocks/wholesale-form.liquid');
  assert.match(liquid, /\{%\s*form\s+'contact'/);
  assert.match(liquid, /name="contact\[tags\]"\s+value="wholesale-inquiry"/);
  assert.match(liquid, /render\s+'form-honeypot',\s*name:\s*'wholesale_website'/);
  assert.match(liquid, /data-submit-cooldown-ms="\{\{ block\.settings\.submit_cooldown_ms \}\}"/);
  assert.doesNotMatch(liquid, /worker_url|data-worker-url|klaviyo_list_id/i);

  const schemaText = liquid.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/)?.[1];
  assert.ok(schemaText, 'block schema exists');
  const schema = JSON.parse(schemaText);
  const cooldown = schema.settings.find((setting) => setting.id === 'submit_cooldown_ms');
  assert.equal(cooldown.default, 0);
  assert.ok(cooldown.max < 10000, 'Shopify server rejects range maxima >=10000');
  assert.match(cooldown.info, /not server-side/i);
  const cooldownMessage = schema.settings.find((setting) => setting.id === 'submit_cooldown_message');
  assert.equal(cooldownMessage.default, 'Please wait {seconds} seconds before trying again.');
});

test('browser handler uses memory-only optional cooldown and renders error as text', () => {
  const source = read('assets/wholesale-form.js');
  assert.doesNotMatch(source, /\bfetch\s*\(|sessionStorage|localStorage|innerHTML|Sentry|workerUrl/i);

  class FakeElement {
    constructor() {
      this.attributes = {
        'data-submit-cooldown-ms': '5000',
        'data-submit-cooldown-message': 'Please wait {seconds} seconds before trying again.',
      };
    }
    getAttribute(name) { return this.attributes[name] ?? null; }
    querySelector() { return this.form; }
    addEventListener() {}
    removeEventListener() {}
  }

  const registered = {};
  const context = {
    HTMLElement: FakeElement,
    customElements: {
      get: (name) => registered[name],
      define: (name, element) => { registered[name] = element; },
    },
    Date: { now: () => 10000 },
    document: {
      createElement: () => ({ textContent: '', className: '', setAttribute() {} }),
    },
  };
  vm.runInNewContext(source, context);
  const formElement = new registered['kg-wholesale-form']();
  let prevented = false;
  const honeypot = { value: '' };
  const errors = { replaceChildren(item) { this.item = item; } };
  formElement.form = {
    querySelector: () => honeypot,
    addEventListener() {},
    removeEventListener() {},
    prepend() {},
  };
  formElement.querySelector = (selector) => selector.includes('errors') ? errors : formElement.form;
  formElement.connectedCallback();
  formElement._onSubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'first valid submission continues to native form handling');
  assert.equal(formElement.lastSubmitAt, 10000);

  prevented = false;
  formElement._onSubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true, 'repeat submission inside cooldown is blocked in this instance');
  assert.equal(errors.item.textContent, 'Please wait 5 seconds before trying again.');
  assert.equal('innerHTML' in errors, false);
});
