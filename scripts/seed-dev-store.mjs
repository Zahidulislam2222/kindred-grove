#!/usr/bin/env node
/**
 * Seed the Kindred Grove dev store with a minimum set of products so that
 * CI smoke tests (Playwright cart/pdp, Percy product-detail, Shopify
 * Lighthouse's auto-fetched product handle) have real content to exercise.
 *
 * Idempotent: if a product with the target handle already exists, this
 * script skips creation and reports existing state.
 *
 * Required env:
 *   SHOPIFY_STORE        — e.g. "kindred-grove.myshopify.com"
 *   ADMIN_API_TOKEN      — Admin API access token, scopes: write_products
 *
 * Usage:
 *   SHOPIFY_STORE=kindred-grove.myshopify.com \
 *   ADMIN_API_TOKEN=shpat_xxx \
 *   node scripts/seed-dev-store.mjs
 */

const API_VERSION = '2025-07';

const { SHOPIFY_STORE, ADMIN_API_TOKEN } = process.env;
if (!SHOPIFY_STORE || !ADMIN_API_TOKEN) {
  console.error('Missing SHOPIFY_STORE or ADMIN_API_TOKEN env var.');
  process.exit(1);
}

const base = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;
const headers = {
  'X-Shopify-Access-Token': ADMIN_API_TOKEN,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const products = [
  {
    handle: 'organic-single-origin-olive-oil',
    title: 'Organic Single-Origin Olive Oil',
    body_html:
      '<p>Cold-pressed within 24 hours of harvest from a single grove in the hills outside Nablus. Peppery finish, grassy nose, pale gold in the bottle.</p><p>500 ml.</p>',
    vendor: 'Kindred Grove',
    product_type: 'Pantry staple',
    tags: ['olive-oil', 'palestine', 'single-origin', 'halal'],
    status: 'active',
    variants: [
      {
        price: '28.00',
        sku: 'KG-OO-500',
        inventory_management: null,
        inventory_policy: 'continue',
        requires_shipping: true,
        taxable: true,
      },
    ],
    options: [{ name: 'Title', values: ['Default Title'] }],
  },
  {
    handle: 'medjool-dates',
    title: 'Medjool Dates — Jericho Oasis',
    body_html:
      '<p>Plump, honey-soft dates harvested by the Qasem family in the Jordan Valley. Packed unwashed to preserve the natural bloom.</p><p>400 g.</p>',
    vendor: 'Kindred Grove',
    product_type: 'Pantry staple',
    tags: ['dates', 'palestine', 'fruit', 'halal'],
    status: 'active',
    variants: [
      {
        price: '18.00',
        sku: 'KG-DT-400',
        inventory_management: null,
        inventory_policy: 'continue',
        requires_shipping: true,
        taxable: true,
      },
    ],
    options: [{ name: 'Title', values: ['Default Title'] }],
  },
];

async function api(path, init = {}) {
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(
      `Shopify API ${res.status} ${res.statusText} on ${init.method || 'GET'} ${path}: ${JSON.stringify(body)}`
    );
  }
  return body;
}

async function findProductByHandle(handle) {
  const { products } = await api(
    `/products.json?handle=${encodeURIComponent(handle)}&fields=id,handle,title,status`
  );
  return products?.[0] || null;
}

async function ensureProduct(spec) {
  const existing = await findProductByHandle(spec.handle);
  if (existing) {
    console.log(
      `↻ already present — id=${existing.id} handle=${existing.handle} status=${existing.status}`
    );
    if (existing.status !== 'active') {
      await api(`/products/${existing.id}.json`, {
        method: 'PUT',
        body: JSON.stringify({ product: { id: existing.id, status: 'active' } }),
      });
      console.log(`  ↳ promoted to active`);
    }
    return existing;
  }
  const { product } = await api('/products.json', {
    method: 'POST',
    body: JSON.stringify({ product: spec }),
  });
  console.log(`✓ created — id=${product.id} handle=${product.handle}`);
  return product;
}

async function main() {
  console.log(`Seeding ${SHOPIFY_STORE} …`);
  for (const spec of products) {
    try {
      await ensureProduct(spec);
    } catch (err) {
      console.error(`✗ failed for ${spec.handle}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
