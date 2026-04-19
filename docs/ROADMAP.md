# Roadmap — Kindred Grove

Last updated: 2026-04-19

Phase 1 is about shipping a production-grade custom Shopify theme. This roadmap records everything downstream — what's deferred, why, and what triggers each phase.

---

## Phase 1 — Complete (2026-04-19)

**Scope:** 14 storefront templates, 8 CI workflows, 8 ADRs, 12 public docs, AI-native delivery workflow documented. See [`CHANGELOG.md`](CHANGELOG.md) for the 21-day breakdown.

**Acceptance criteria** (per SOW §8):
- All quality bars met: Lighthouse ≥ 95 on all four categories, axe 0 violations, Playwright 5/5 golden paths, theme-check 0 offenses.
- Repository public with green CI on main.
- Merchant handoff guide reviewed.
- Case-study site, walkthrough video, retrospective — Week 4 deliverables.

**Week 4 pre-ship checklist** (batched browser/manual tasks):
- [ ] Klaviyo abandoned-cart flow built in Klaviyo admin
- [ ] Judge.me widget installed to theme from the app
- [ ] Sentry project created + DSN pasted in theme customizer + test error fired
- [ ] Google Tag Assistant validation (GA4 events fire on real clicks)
- [ ] VoiceOver full purchase-funnel walkthrough
- [ ] NVDA full purchase-funnel walkthrough
- [ ] Keyboard-only purchase-flow audit
- [ ] Rich Results test pass (Product + FAQ + Recipe + Breadcrumb schemas)
- [ ] Shopify admin: Arabic language enabled, EUR/GBP currencies enabled
- [ ] Theme editor walkthrough: compose a demo homepage from scratch
- [ ] Cloudflare Worker deploy for wholesale draft-order (optional)
- [ ] Checkout UI extension deploy from Shopify app project (optional)

---

## Phase 1.5 — Stabilization + real deployments (2 weeks post-launch)

Triggered by: launch. Delivered once the live storefront has real traffic.

- Deploy the wholesale draft-order Cloudflare Worker (`scripts/wholesale-draft-order-worker.js`) to the client's Cloudflare account. Replaces the `/contact`-only fallback path.
- Deploy the checkout UI extension (`extensions/checkout-trust-badges/`) via a separate Shopify app project. Ship the trust-block into checkout.
- Upgrade dev store to Shopify Basic plan — removes forced password gate, unlocks the headless-Chrome bot-protection issue currently gating cart-mutation e2e specs. Flip cart specs from `test.skip(on-401)` to assert-always.
- Production-grade Lighthouse baseline capture + month-over-month tracking.
- First Sentry error-review session — tag any noise, tighten `beforeSend` filters.

---

## Phase 2 — Hydrogen headless (Quarter-scale project)

**Triggered by:** sustained ≥ 50K sessions/month OR client desire for a custom PDP/storefront that exceeds what Liquid can ergonomically deliver.

### What it includes

- Rebuild the storefront on Hydrogen (Remix) — headless front-end consuming Shopify's Storefront API.
- Migrate current theme's metaobject-first content model (no DB changes — metaobjects survive the transition per ADR-003).
- Ship on Oxygen (Shopify's hosted Hydrogen runtime).
- Maintain the same 8 CI workflows + a new build-time check (Remix route-level perf, server-side render validation).
- Open route-level prefetching + edge streaming that's not possible in Liquid.

### What it does not include

- Moving off Shopify. Shopify Admin, checkout, customer accounts stay.
- Removing the current Liquid theme. Phase 2 spins up a parallel Hydrogen app at a subdomain; the theme stays at `kindred-grove.myshopify.com` for a crossover window.

### Pre-reqs

- Shopify Plus or equivalent (Storefront API rate limits on lower plans bite at scale).
- Dedicated dev team (Hydrogen is a 4-6 week build).
- Explicit client sign-off on rebuild ROI vs. continued Liquid iteration.

---

## Phase 3 — Custom Shopify app (optional)

**Triggered by:** recurring need for Admin-API write operations that can't live in a theme (customer metafield writes from a quiz, dynamic collection generation from ML, custom order-tagging rules).

### What it includes

- A standalone Node/Remix or Rust-based Shopify app in its own repository.
- OAuth install flow (Shopify's Partner Dashboard).
- App extensions: customer-account UI extension, order-status extension, admin-link extension as needed.
- Webhooks: `orders/create`, `customers/create`, `products/update` → internal pipelines.

### What it replaces

- The Cloudflare Worker at `scripts/wholesale-draft-order-worker.js` — the app takes over draft-order creation with proper access scopes + observability.
- The deferred customer-metafield write for the pantry-persona result — the app persists it cleanly via Admin GraphQL.

---

## Phase 4 — Real A/B infrastructure

**Triggered by:** merchant wants to run > 3 concurrent experiments or needs statistical-significance reporting.

### Current (Phase 1)

- localStorage feature flags (per [ADR-008](adr/008-localstorage-feature-flags.md)) — zero-infra, URL override, DNT compliance. Good for dark launches, unsafe for pricing + checkout content, doesn't compute significance.

### Phase 4 options

- **GrowthBook** (open-source, self-hostable) — most flexibility, some ops overhead.
- **PostHog** — all-in-one product analytics + experiments.
- **Split.io** / **LaunchDarkly** — commercial, polished, costly.

Decision deferred until real experimentation cadence is established. The current flag system's API (`window.KG_FF.isEnabled(name)` / `.variant(name)`) is designed to be swappable — Phase 4 replaces the implementation, not the call sites.

---

## Phase 5 — Shopify Plus subscription

**Triggered by:** GMV / scale milestone that justifies the spend.

### What changes

- Checkout customization (Shopify Functions for cart transform, discount, payment customization, shipping method logic).
- Checkout extensibility — deploy the trust-badge extension (already scaffolded) + ship a B2B gate for the wholesale flow.
- Script editor for gift-with-purchase + tiered pricing.
- Launchpad for coordinated campaign drops.
- Higher Storefront API rate limits (relevant for Phase 2 Hydrogen).

Out of Phase 1 scope per SOW §4; noted here for downstream reference.

---

## Perma-deferred items (SOW §4 Out of Scope)

- **Meta Pixel activation** — deferred because the Kindred Grove Facebook Business account was blocked during Phase 1 setup. Reactivation + Meta CAPI live when real ad traffic is planned.
- **Real 3D modeling** — a placeholder `.glb` ships with the PDP; commissioning custom scans is a separate vendor engagement.
- **PWA / service worker** — Shopify's native PWA wrapper in the mobile SDKs is the client's preferred path when they need it; custom service-worker work is explicitly out of scope.
- **Custom domain** — `kindred-grove.myshopify.com` is used for the engagement duration. Client-owned domain lands at launch.

---

## Stretch ideas (not roadmapped)

- **AI-powered product recommendations** — replace Shopify's built-in recommender with an OpenAI-embeddings-based similarity search on product descriptions + farm metaobjects. Interesting, un-proven ROI, low priority.
- **Farmer-story podcast** — one 10-min episode per farm, embedded on the origin detail page with audio-player block + transcript. Needs content-production budget.
- **AR try-on** for pantry display — WebXR preview of products on the user's shelf. Novelty; depends on real product photography tooling the team doesn't have yet.
- **Printable recipe cards** — CSS print stylesheet + "Save as PDF" button on recipe pages. Low lift, nice delight.

---

## How to propose a new roadmap item

Open a GitHub issue tagged `roadmap`. Include:
- The trigger that would pull it forward (metric, client ask, regulatory change).
- Rough scope estimate (days / weeks).
- Pre-reqs (infrastructure, skills, plan upgrades).
- Which phase it belongs in, or if it warrants a new one.

Items without a trigger stay in the Stretch bucket.
