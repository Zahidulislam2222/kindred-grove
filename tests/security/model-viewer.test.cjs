'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const block = fs.readFileSync('blocks/model-viewer.liquid', 'utf8');
const source = fs.readFileSync('assets/model-viewer.js', 'utf8');
const configSnippet = fs.readFileSync('snippets/model-viewer-config.liquid', 'utf8');
const config = {
  loadTimeoutMs: 12000,
  feature: { name: 'model-viewer-ui', version: '1.0' },
  copy: { heading: '3D view', body: 'Rotate and zoom.', loadLabel: 'Load 3D preview', loadingLabel: 'Loading 3D preview…', unavailableLabel: '3D preview unavailable.', noScriptLabel: 'Enable JavaScript.' },
};

class Target {
  constructor() { this.handlers = new Map(); }
  addEventListener(type, handler) { this.handlers.set(type, [...(this.handlers.get(type) || []), handler]); }
  removeEventListener(type, handler) { this.handlers.set(type, (this.handlers.get(type) || []).filter((item) => item !== handler)); }
  dispatch(type) { for (const handler of this.handlers.get(type) || []) handler(); }
  count(type) { return (this.handlers.get(type) || []).length; }
}

function harness({ loader = true } = {}) {
  let Component;
  let featureRequest = null;
  let uiCount = 0;
  let timerSequence = 0;
  const timers = new Map();
  class FakeElement extends Target {
    constructor() {
      super();
      this.isConnected = true;
      this.nodes = {
        '[data-kg-model-load]': Object.assign(new Target(), { disabled: false, hidden: false, textContent: '' }),
        '[data-kg-model-status]': { textContent: '' },
        '[data-kg-model-poster]': { hidden: false },
        '[data-kg-model-viewer]': {
          hidden: true,
          children: null,
          replaceChildren(node) { this.children = node || null; },
          querySelector() { return this.children ? {} : null; },
        },
        '[data-kg-model-template]': { content: { cloneNode: () => ({ clone: true }) } },
        '[data-kg-model-config]': { dataset: { json: JSON.stringify(config) } },
      };
    }
    querySelector(selector) {
      return this.nodes[selector] || null;
    }
    getAttribute(name) { return name === 'data-unavailable-label' ? '3D preview unavailable.' : null; }
  }
  const customElements = {
    existing: false,
    get() { return this.existing ? Component : undefined; },
    define(_name, constructor) { Component = constructor; this.existing = true; },
  };
  const window = {
    Shopify: { ModelViewerUI: function ModelViewerUI() { uiCount += 1; } },
    setTimeout(handler, _delay) { const id = ++timerSequence; timers.set(id, handler); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  if (loader) window.Shopify.loadFeatures = (features) => { featureRequest = features[0]; };
  vm.runInNewContext(source, { window, customElements, HTMLElement: FakeElement, JSON });
  const element = new Component();
  return {
    element, window,
    get featureRequest() { return featureRequest; },
    get uiCount() { return uiCount; },
    fireTimer() { const first = timers.entries().next().value; if (first) { timers.delete(first[0]); first[1](); } },
    get pendingTimers() { return timers.size; },
  };
}

test('block renders only for model media using Shopify native filter and no remote/AR/auto-rotate loader', () => {
  assert.match(block, /if model/);
  assert.match(block, /model \| model_viewer_tag/);
  assert.match(block, /data-kg-model-template/);
  assert.match(block, /data-kg-model-status[^>]*>[\s\S]*?block\.settings\.unavailable_label \| escape/);
  assert.match(block, /model\.preview_image \| image_url/);
  assert.match(block, /data-kg-model-load[^>]+hidden/);
  assert.match(block, /'model-viewer\.js' \| asset_url/);
  assert.doesNotMatch(block, /ajax\.googleapis\.com|RemoteAsset|auto-rotate|\bar\b|ar-modes|modelviewer\.dev/);
  assert.match(configSnippet, /"name": "model-viewer-ui"/);
  assert.match(configSnippet, /"version": "1\.0"/);
  assert.match(configSnippet, /"loadTimeoutMs": 12000/);
  assert.match(configSnippet, /block\.settings\.(?:load_label|loading_label|unavailable_label)/);
  assert.doesNotMatch(source, /https?:\/\/|version\s*:\s*['"][^'"]+['"]|setTimeout\([^,]+,\s*\d+\s*\)/);
});

test('explicit activation loads configured Shopify feature and creates one UI across reconnects', () => {
  const h = harness();
  h.element.connectedCallback();
  assert.equal(h.featureRequest, null, 'feature loading waits for visitor activation');
  assert.equal(h.element.button.count('click'), 1);

  h.element.button.dispatch('click');
  assert.equal(h.featureRequest.name, 'model-viewer-ui');
  assert.equal(h.featureRequest.version, '1.0');
  assert.equal(h.element.status.textContent, config.copy.loadingLabel);
  assert.equal(h.pendingTimers, 1);
  h.featureRequest.onLoad([]);
  assert.equal(h.pendingTimers, 0);
  assert.equal(h.uiCount, 1);
  assert.equal(h.element.viewerContainer.hidden, false);
  assert.equal(h.element.poster.hidden, true);
  assert.equal(h.element.button.hidden, true);
  h.featureRequest.onLoad([]);
  assert.equal(h.uiCount, 1, 'a duplicate provider callback cannot initialize the UI twice');

  h.element.disconnectedCallback();
  assert.equal(h.element.button.count('click'), 0);
  h.element.connectedCallback();
  assert.equal(h.element.button.count('click'), 1);
  h.element.button.dispatch('click');
  assert.equal(h.featureRequest.name, 'model-viewer-ui');
  assert.equal(h.uiCount, 1, 'reconnect must not create another Shopify UI instance');
});

test('unavailable loader and failed feature expose fallback status without throwing', () => {
  const missing = harness({ loader: false });
  missing.element.connectedCallback();
  missing.element.button.dispatch('click');
  assert.equal(missing.element.status.textContent, config.copy.unavailableLabel);
  assert.equal(missing.element.button.disabled, true);

  const failed = harness();
  failed.element.connectedCallback();
  failed.element.button.dispatch('click');
  failed.featureRequest.onLoad(new Error('feature failed'));
  assert.equal(failed.element.status.textContent, config.copy.unavailableLabel);
  assert.equal(failed.uiCount, 0);
});

test('a nonresponsive loader times out and late completion cannot revive the viewer', () => {
  const h = harness();
  h.element.connectedCallback();
  h.element.button.dispatch('click');
  const lateRequest = h.featureRequest;
  h.fireTimer();
  assert.equal(h.element.status.textContent, config.copy.unavailableLabel);
  assert.equal(h.pendingTimers, 0);
  lateRequest.onLoad([]);
  assert.equal(h.uiCount, 0);
  assert.equal(h.element.viewerContainer.hidden, true);
});

test('stale load callback after disconnect is ignored and reconnect can safely retry once', () => {
  const h = harness();
  h.element.connectedCallback();
  h.element.button.dispatch('click');
  const staleRequest = h.featureRequest;
  h.element.disconnectedCallback();
  assert.equal(h.pendingTimers, 0);
  staleRequest.onLoad([]);
  assert.equal(h.uiCount, 0);
  assert.equal(h.element.viewerContainer.hidden, true);

  h.element.isConnected = true;
  h.element.connectedCallback();
  h.element.button.dispatch('click');
  const currentRequest = h.featureRequest;
  currentRequest.onLoad([]);
  assert.equal(h.uiCount, 1);
});
