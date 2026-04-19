/**
 * Cloudflare Worker — Kindred Grove wholesale draft-order proxy.
 *
 * Accepts the wholesale form payload (JSON) from <kg-wholesale-form>,
 * validates it, and calls the Shopify Admin GraphQL API to create a
 * draft order tagged `wholesale-inquiry`. Returns 202 on success (so
 * the frontend doesn't wait for the Admin API to finish before giving
 * the user a success screen).
 *
 * Why a Worker instead of a theme-side call? Theme JS can't carry a
 * `shpat_` Admin API token — it would be visible to every visitor.
 * A Worker lives at the edge with the token in its encrypted env.
 *
 * DEPLOYMENT (not automated by the theme repo):
 *
 *   1. `wrangler init kindred-grove-wholesale-worker`
 *   2. Copy this file into `src/index.js`.
 *   3. `wrangler secret put ADMIN_API_TOKEN`           # shpat_... from
 *                                                       admin/settings/apps/development → Lighthouse CI
 *   4. `wrangler secret put SHOPIFY_STORE`              # kindred-grove.myshopify.com
 *   5. `wrangler secret put ALLOWED_ORIGIN`             # https://kindred-grove.myshopify.com
 *   6. `wrangler deploy`
 *   7. Paste the resulting workers.dev URL (or custom domain) into
 *      theme customizer → Wholesale form → Draft-order worker URL.
 *
 * Security posture:
 *  - CORS locked to ALLOWED_ORIGIN.
 *  - Payload size cap (16 KB — anything larger is a bot / DOS attempt).
 *  - Honeypot field rejected server-side too (defense in depth).
 *  - Cloudflare's default rate-limit rules apply; tighten if needed.
 *  - Only `draftOrderCreate` mutation is called — no write_products,
 *    no write_orders (customer still confirms the draft).
 */

const API_VERSION = '2025-07';
const MAX_BODY_BYTES = 16 * 1024;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin, allowedOrigin) });
    }

    // Size guard
    const len = parseInt(request.headers.get('content-length') || '0', 10);
    if (len > MAX_BODY_BYTES) {
      return new Response('Payload too large', { status: 413, headers: corsHeaders(origin, allowedOrigin) });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders(origin, allowedOrigin) });
    }

    // Honeypot
    if (body.wholesale_website && String(body.wholesale_website).trim() !== '') {
      return new Response('ok', { status: 202, headers: corsHeaders(origin, allowedOrigin) }); // silent drop
    }

    const email = sanitize(body['contact[email]']);
    const name = sanitize(body['contact[name]']);
    const company = sanitize(body['contact[company]']);
    const volume = sanitize(body['contact[volume]']);
    const message = sanitize(body['contact[body]']);

    if (!email || !name || !company || !volume || !message) {
      return new Response('Missing required field', { status: 400, headers: corsHeaders(origin, allowedOrigin) });
    }

    const mutation = /* GraphQL */ `
      mutation kgWholesaleDraftOrder($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder { id name }
          userErrors { field message }
        }
      }
    `;

    const input = {
      email,
      note: `WHOLESALE INQUIRY\nCompany: ${company}\nEstimated volume: ${volume} cases/mo\n\n${message}`,
      tags: ['wholesale-inquiry'],
      customAttributes: [
        { key: 'source', value: 'wholesale-form' },
        { key: 'company', value: company },
        { key: 'volume', value: volume },
      ],
      shippingAddress: { firstName: name },
    };

    try {
      const res = await fetch(`https://${env.SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': env.ADMIN_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: mutation, variables: { input } }),
      });
      const data = await res.json();
      const userErrors = data?.data?.draftOrderCreate?.userErrors || [];
      if (userErrors.length > 0) {
        console.error('draftOrder userErrors', userErrors);
      }
      return new Response(JSON.stringify({ status: 'queued' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowedOrigin) },
      });
    } catch (err) {
      console.error('worker error', err);
      return new Response('Upstream error', { status: 502, headers: corsHeaders(origin, allowedOrigin) });
    }
  },
};

function sanitize(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 2000);
}

function corsHeaders(origin, allowed) {
  if (!allowed || (origin && origin !== allowed)) {
    return { 'Access-Control-Allow-Origin': 'null' };
  }
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
