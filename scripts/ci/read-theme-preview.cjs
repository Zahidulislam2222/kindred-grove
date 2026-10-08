'use strict';

const fs = require('node:fs');
const { normalizeShopifyStoreHost } = require('../config/test-config.cjs');

const file = process.argv[2];
if (!file) throw new Error('Shopify theme push JSON path is required.');

let expectedStoreHost;
try {
  expectedStoreHost = normalizeShopifyStoreHost(process.env.SHOPIFY_STORE);
} catch {
  throw new Error('SHOPIFY_STORE must be set to a valid myshopify.com hostname.');
}

let result;
try {
  result = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch {
  throw new Error('Shopify theme push output is missing or invalid JSON.');
}

const themeId = result?.theme?.id ?? result?.theme_id;
const rawPreviewUrl = result?.theme?.preview_url ?? result?.preview_url;
if (!(typeof themeId === 'number' && Number.isSafeInteger(themeId) && themeId > 0)
  && !(typeof themeId === 'string' && /^\d+$/.test(themeId))) {
  throw new Error('Shopify theme push output did not include a theme ID.');
}
if (typeof rawPreviewUrl !== 'string') {
  throw new Error('Shopify theme push output did not include a preview URL.');
}

let previewUrl;
try {
  previewUrl = new URL(rawPreviewUrl);
} catch {
  throw new Error('Shopify theme push output contained an invalid preview URL.');
}
if (previewUrl.protocol !== 'https:' || previewUrl.username || previewUrl.password) {
  throw new Error('Shopify theme push preview URL must use HTTPS and contain no URL credentials.');
}
if (previewUrl.hostname.toLowerCase() !== expectedStoreHost) {
  throw new Error('Shopify theme push preview URL does not match SHOPIFY_STORE.');
}
const previewIds = previewUrl.searchParams.getAll('preview_theme_id');
if (previewIds.length !== 1 || previewIds[0] !== String(themeId)) {
  throw new Error('Shopify theme push preview URL does not match its theme ID.');
}

process.stdout.write(`base_url=${previewUrl.origin}\n`);
process.stdout.write(`preview_url=${previewUrl.href}\n`);
process.stdout.write(`theme_id=${String(themeId)}\n`);
