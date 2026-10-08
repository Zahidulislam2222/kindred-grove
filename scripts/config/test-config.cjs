'use strict';

const runnerDefaults = require('./test-defaults.json');

function validatedPositiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid test configuration default: ${name} must be a positive integer.`);
  }
  return value;
}

function readRunnerDefaults(defaults = runnerDefaults) {
  return Object.freeze({
    testTimeoutMs: validatedPositiveInteger(defaults.testTimeoutMs, 'testTimeoutMs'),
    expectTimeoutMs: validatedPositiveInteger(defaults.expectTimeoutMs, 'expectTimeoutMs'),
    actionTimeoutMs: validatedPositiveInteger(defaults.actionTimeoutMs, 'actionTimeoutMs'),
    navigationTimeoutMs: validatedPositiveInteger(defaults.navigationTimeoutMs, 'navigationTimeoutMs'),
    ciRetries: nonNegativeInteger(defaults.ciRetries, 'ciRetries'),
    localRetries: nonNegativeInteger(defaults.localRetries, 'localRetries'),
    ciWorkers: validatedPositiveInteger(defaults.ciWorkers, 'ciWorkers'),
    localWorkers: validatedWorkers(defaults.localWorkers),
  });
}

function nonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid test configuration default: ${name} must be a non-negative integer.`);
  }
  return value;
}

function validatedWorkers(value) {
  if (Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^(?:[1-9]\d*|[1-9]\d*%)$/.test(value)) return value;
  throw new Error('Invalid test configuration default: localWorkers must be a positive integer or percentage.');
}

function strictBoolean(value, name) {
  if (value === undefined || value === '') return false;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`Invalid ${name}: use "true" or "false".`);
}

function validateTargetUrl(raw, name) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`${name} is required.`);
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL or localhost HTTP URL.`);
  }

  if (url.username || url.password) {
    throw new Error(`${name} must not contain URL credentials.`);
  }
  for (const key of url.searchParams.keys()) {
    if (/(?:pass(?:word)?|token|secret|auth|credential|api[-_]?key)/i.test(key)) {
      throw new Error(`${name} must not contain credential-like query parameters.`);
    }
  }

  const localhost = url.hostname === 'localhost'
    || url.hostname === '127.0.0.1'
    || url.hostname === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localhost)) {
    throw new Error(`${name} must use HTTPS; HTTP is allowed only for localhost.`);
  }

  return url.toString();
}

function normalizeShopifyStoreHost(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error('SHOPIFY_STORE must be a valid myshopify.com hostname.');
  }
  let url;
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    throw new Error('SHOPIFY_STORE must be a valid myshopify.com hostname.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || url.pathname !== '/' || url.search || url.hash
    || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/i.test(url.hostname)) {
    throw new Error('SHOPIFY_STORE must be a valid myshopify.com hostname.');
  }
  return url.hostname.toLowerCase();
}

function assertExpectedOrigin(currentUrl, expectedUrl, name = 'Navigation') {
  let current;
  let expected;
  try {
    current = new URL(currentUrl);
    expected = new URL(expectedUrl);
  } catch {
    throw new Error(`${name} did not resolve to a valid URL.`);
  }
  if (current.username || current.password || expected.username || expected.password) {
    throw new Error(`${name} must not contain URL credentials.`);
  }
  if (current.origin !== expected.origin) {
    throw new Error(`${name} redirected away from the configured target origin.`);
  }
}

function assertPasswordSubmissionMethod(formMethod, submitterMethod) {
  const effectiveMethod = String(submitterMethod || formMethod || '').toUpperCase();
  if (effectiveMethod !== 'POST') {
    throw new Error('Storefront password form must submit using POST.');
  }
}

function passwordValue(env) {
  const canonical = env.SHOPIFY_STORE_PASSWORD;
  const legacy = env.STORE_PASSWORD;
  const hasCanonical = typeof canonical === 'string' && canonical.length > 0;
  const hasLegacy = typeof legacy === 'string' && legacy.length > 0;

  if (hasCanonical && hasLegacy && canonical !== legacy) {
    throw new Error('Conflicting password settings: set only SHOPIFY_STORE_PASSWORD or STORE_PASSWORD.');
  }
  return hasCanonical ? canonical : (hasLegacy ? legacy : undefined);
}

function countryValue(raw) {
  if (raw === undefined || raw === '') return undefined;
  if (typeof raw !== 'string' || !/^[A-Za-z]{2}$/.test(raw)) {
    throw new Error('Invalid TEST_COUNTRY: use two ASCII letters in ISO 3166-1 alpha-2 format.');
  }
  return raw.toUpperCase();
}

function readTestConfig(env = process.env, defaults = runnerDefaults) {
  const runner = readRunnerDefaults(defaults);
  const baseUrl = validateTargetUrl(env.BASE_URL, 'BASE_URL');
  const previewUrl = env.PREVIEW_URL
    ? validateTargetUrl(env.PREVIEW_URL, 'PREVIEW_URL')
    : undefined;
  const storeHost = env.SHOPIFY_STORE ? normalizeShopifyStoreHost(env.SHOPIFY_STORE) : undefined;

  if (previewUrl) {
    const preview = new URL(previewUrl);
    const previewIds = preview.searchParams.getAll('preview_theme_id');
    if (previewIds.length !== 1 || !/^\d+$/.test(previewIds[0])) {
      throw new Error('PREVIEW_URL must include exactly one numeric preview_theme_id.');
    }
    if (storeHost) {
      if (preview.hostname.toLowerCase() !== storeHost) {
        throw new Error('PREVIEW_URL must match SHOPIFY_STORE.');
      }
    } else if (preview.origin !== new URL(baseUrl).origin) {
      throw new Error('PREVIEW_URL must have the same origin as BASE_URL when SHOPIFY_STORE is unset.');
    }
  }

  const isCI = strictBoolean(env.CI, 'CI');

  return Object.freeze({
    baseUrl,
    previewUrl,
    storeHost,
    storePassword: passwordValue(env),
    testCountry: countryValue(env.TEST_COUNTRY),
    isCI,
    retries: isCI ? runner.ciRetries : runner.localRetries,
    workers: isCI ? runner.ciWorkers : runner.localWorkers,
    ...runner,
  });
}

module.exports = { readTestConfig, readRunnerDefaults, validateTargetUrl, normalizeShopifyStoreHost, assertExpectedOrigin, assertPasswordSubmissionMethod };
