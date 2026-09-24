'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync('assets/announcement-bar.js', 'utf8');

class Target {
  constructor() { this.handlers = new Map(); }
  addEventListener(type, fn) { this.handlers.set(type, [...(this.handlers.get(type) || []), fn]); }
  removeEventListener(type, fn) { this.handlers.set(type, (this.handlers.get(type) || []).filter((candidate) => candidate !== fn)); }
  dispatch(type) { for (const fn of this.handlers.get(type) || []) fn(); }
  count(type) { return (this.handlers.get(type) || []).length; }
}

test('announcement dismissal exists only for the page and reconnect keeps one click handler', () => {
  let Component;
  class FakeElement extends Target {
    constructor() { super(); this.attrs = { 'data-dismissible': 'true' }; this.close = new Target(); this.removed = false; }
    getAttribute(name) { return this.attrs[name] || null; }
    querySelector() { return this.close; }
    remove() { this.removed = true; this.disconnectedCallback(); }
  }
  const customElements = { get: () => null, define: (_tag, ctor) => { Component = ctor; } };
  vm.runInNewContext(source, { HTMLElement: FakeElement, customElements });
  const bar = new Component();
  bar.connectedCallback();
  assert.equal(bar.close.count('click'), 1);
  bar.disconnectedCallback();
  assert.equal(bar.close.count('click'), 0);
  bar.connectedCallback();
  assert.equal(bar.close.count('click'), 1);
  bar.close.dispatch('click');
  assert.equal(bar.removed, true);
  assert.doesNotMatch(source, /localStorage|dismissKey|dismiss-key/);
});

test('announcement block has no content-derived persistence key and escapes configured links', () => {
  const block = fs.readFileSync('blocks/announcement-bar.liquid', 'utf8');
  assert.doesNotMatch(block, /md5|data-dismiss-key|localStorage/);
  assert.match(block, /href="\{\{ link \| escape \}\}"/);
});
