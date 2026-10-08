'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readTestConfig, assertExpectedOrigin, assertPasswordSubmissionMethod } = require('../../scripts/config/test-config.cjs');

test('fails before Playwright starts when BASE_URL is missing', () => {
  assert.throws(() => readTestConfig({}), /BASE_URL is required/);
});

test('accepts HTTPS targets and an optional same-origin local preview URL', () => {
  const config = readTestConfig({
    BASE_URL: 'https://shop.example.test',
    PREVIEW_URL: 'https://shop.example.test/?preview_theme_id=123',
  });
  assert.equal(config.baseUrl, 'https://shop.example.test/');
  assert.equal(config.previewUrl, 'https://shop.example.test/?preview_theme_id=123');
  assert.equal(config.storePassword, undefined);
});

test('accepts HTTP only for local development targets', () => {
  const config = readTestConfig({ BASE_URL: 'http://localhost:9292' });
  assert.equal(config.baseUrl, 'http://localhost:9292/');
  assert.throws(() => readTestConfig({ BASE_URL: 'http://shop.example.test' }), /must use HTTPS/);
});

test('rejects unsupported protocols and credential-bearing URLs', () => {
  assert.throws(() => readTestConfig({ BASE_URL: 'ftp://shop.example.test' }), /must use HTTPS/);
  assert.throws(() => readTestConfig({ BASE_URL: 'https://user:pass@shop.example.test' }), /must not contain URL credentials/);
  assert.throws(() => readTestConfig({ BASE_URL: 'https://shop.example.test/?access_token=fake' }), /credential-like query parameters/);
});

test('rejects a preview target on a different origin', () => {
  assert.throws(() => readTestConfig({
    BASE_URL: 'https://shop.example.test',
    PREVIEW_URL: 'https://other.example.test/?preview_theme_id=123',
  }), /same origin/);
});

test('binds configured Shopify preview to store host while allowing an explicitly configured custom base domain', () => {
  const config = readTestConfig({
    BASE_URL: 'https://www.example.test',
    PREVIEW_URL: 'https://shop.myshopify.com/?preview_theme_id=123',
    SHOPIFY_STORE: 'shop.myshopify.com',
  });
  assert.equal(config.baseUrl, 'https://www.example.test/');
  assert.equal(config.storeHost, 'shop.myshopify.com');
  assert.throws(() => readTestConfig({
    BASE_URL: 'https://www.example.test',
    PREVIEW_URL: 'https://attacker.example/?preview_theme_id=123',
    SHOPIFY_STORE: 'shop.myshopify.com',
  }), /must match SHOPIFY_STORE/);
  assert.throws(() => readTestConfig({
    BASE_URL: 'https://www.example.test',
    PREVIEW_URL: 'https://shop.myshopify.com/?preview_theme_id=123&preview_theme_id=456',
    SHOPIFY_STORE: 'shop.myshopify.com',
  }), /exactly one numeric preview_theme_id/);
});

test('rejects a simulated redirect away from the configured password target before secret submission', () => {
  assert.doesNotThrow(() => assertExpectedOrigin(
    'https://shop.myshopify.com/password',
    'https://shop.myshopify.com/?preview_theme_id=123',
    'Storefront password page',
  ));
  assert.throws(() => assertExpectedOrigin(
    'https://attacker.example/password',
    'https://shop.myshopify.com/?preview_theme_id=123',
    'Storefront password page',
  ), /redirected away from the configured target origin/);
  assert.throws(() => assertExpectedOrigin(
    'https://attacker.example/collect',
    'https://shop.myshopify.com/password',
    'Storefront password form',
  ), /redirected away from the configured target origin/);
  assert.throws(() => assertExpectedOrigin(
    'https://attacker.example/collect',
    'https://shop.myshopify.com/password',
    'Storefront password submitter',
  ), /redirected away from the configured target origin/);
  assert.throws(() => assertExpectedOrigin(
    'https://user:pass@shop.myshopify.com/password',
    'https://shop.myshopify.com/password',
    'Storefront password page',
  ), /must not contain URL credentials/);
});

test('password forms use POST unless safely overridden to POST by their submitter', () => {
  assert.doesNotThrow(() => assertPasswordSubmissionMethod('post', ''));
  assert.doesNotThrow(() => assertPasswordSubmissionMethod('get', 'post'));
  assert.throws(() => assertPasswordSubmissionMethod('get', ''), /must submit using POST/);
  assert.throws(() => assertPasswordSubmissionMethod('post', 'get'), /must submit using POST/);
});

test('accepts the canonical password and legacy alias when values agree', () => {
  const config = readTestConfig({
    BASE_URL: 'https://shop.example.test',
    SHOPIFY_STORE_PASSWORD: 'test-password',
    STORE_PASSWORD: 'test-password',
  });
  assert.equal(config.storePassword, 'test-password');
});

test('rejects conflicting password aliases without echoing either value', () => {
  const first = 'fake-password-one';
  const second = 'fake-password-two';
  assert.throws(() => readTestConfig({
    BASE_URL: 'https://shop.example.test',
    SHOPIFY_STORE_PASSWORD: first,
    STORE_PASSWORD: second,
  }), error => {
    assert.match(error.message, /Conflicting password settings/);
    assert.equal(error.message.includes(first), false);
    assert.equal(error.message.includes(second), false);
    return true;
  });
});

test('requires strict CI boolean values', () => {
  assert.equal(readTestConfig({ BASE_URL: 'https://shop.example.test', CI: 'true' }).isCI, true);
  assert.equal(readTestConfig({ BASE_URL: 'https://shop.example.test', CI: '0' }).isCI, false);
  assert.throws(() => readTestConfig({ BASE_URL: 'https://shop.example.test', CI: 'yes' }), /Invalid CI/);
});

test('parses optional TEST_COUNTRY without imposing a country default', () => {
  assert.equal(readTestConfig({ BASE_URL: 'https://shop.example.test' }).testCountry, undefined);
  assert.equal(readTestConfig({ BASE_URL: 'https://shop.example.test', TEST_COUNTRY: 'us' }).testCountry, 'US');
  assert.throws(() => readTestConfig({ BASE_URL: 'https://shop.example.test', TEST_COUNTRY: 'USA' }), /two ASCII letters/);
  assert.throws(() => readTestConfig({ BASE_URL: 'https://shop.example.test', TEST_COUNTRY: '1A' }), /two ASCII letters/);
});

test('rejects malformed runner defaults', () => {
  assert.throws(() => readTestConfig({ BASE_URL: 'https://shop.example.test' }, { testTimeoutMs: Infinity }), /positive integer/);
});
