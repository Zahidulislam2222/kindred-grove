# ADR-008 — localStorage-based feature flags for theme A/B

**Status:** Accepted
**Date:** 2026-04-19 (Day 10)
**Deciders:** Zahidul Islam (developer) on behalf of the Kindred Grove engagement

---

## Context

Kindred Grove needs a way to ship small UI variations and test them without going through a full theme deploy or paying for a third-party experimentation platform. Two concrete near-term needs:

1. The homepage hero copy and CTA wording are candidates for A/B variants — the brand voice is still settling and the merchant wants to see which phrasing converts better.
2. The "Build your pantry" quiz (shipped this same day) is a large feature and we want to be able to dark-launch it: live in the theme, but gated off for most visitors until the merchant is ready to expose it.

Available options for this layer:

1. **Shopify Markets Pro + native experiments.** Shopify's experiment feature. Good if the user is on Plus. Kindred Grove is not — and this is a portfolio engagement that needs to work on a free dev store.
2. **Third-party A/B tool.** Google Optimize (sunset), VWO, Optimizely, Convert, GrowthBook. Adds a render-blocking script tag, adds a $50–$500/mo cost, adds a GDPR consent surface. Overkill for a 1–3 variant problem and out of scope for this build budget.
3. **Server-side split via Shopify sections.** Pick section variants by a bucketing value in a cookie. Requires setting the cookie on the first server response; Shopify's Liquid layer cannot set cookies, so this would need a separate edge worker (Cloudflare Workers). Adds infrastructure we don't otherwise need.
4. **Client-side localStorage flags.** A small JS utility assigns a visitor to a variant once, persists the assignment in `localStorage`, and exposes an API (`window.KG_FF.isEnabled(name)`, `window.KG_FF.variant(name)`) that any block or script can read. Merchant configures flag definitions (name, default, rollout %, variants) in a JSON field in theme settings. Merchant can force-enable any flag via a URL parameter (`?kg_ff=new_hero`) for QA. Honors Do Not Track (DNT) by disabling bucketing for users who opt out — such visitors always see the default.

## Decision

**We implement feature flags as a client-side module at `assets/feature-flags.js` with flag definitions in `config/settings_schema.json` → "Feature flags" group.** The module exposes `window.KG_FF` with three methods (`get`, `isEnabled`, `variant`), persists the assignment per-visitor in `localStorage`, allows merchant/QA override via URL param, and is loaded with `defer` in `<head>` (definitions pre-injected as `window.__KG_FF_DEFS__` from Liquid settings). Deferred scripts run in document order, so every other deferred body script (`announcement-bar.js`, `quick-view.js`, `cart-drawer.js`, `theme.js`) sees `window.KG_FF` already initialized.

Bucketing is deterministic on a hash of (`flag_name`, `visitor_id`) where `visitor_id` is a random UUID generated on first visit and stored in localStorage. This gives each visitor a stable assignment across pages and sessions without any identification.

DNT is respected: if `navigator.doNotTrack === '1'` (or `window.doNotTrack === '1'`), all flags return their default — no bucketing, no localStorage writes beyond the visitor ID (which is never linked to any external service anyway).

## Consequences

**Positives**

- Zero infrastructure and zero cost.
- The whole system is ~3 KB of JS. No render blocking, no third-party domain.
- Merchant can add / remove / adjust rollout of a flag from the theme editor, no redeploy.
- URL param override (`?kg_ff=variant_b`) makes QA trivial — reviewers can preview every variant without touching the admin.
- Every flag read is synchronous after the first paint, so blocks can read flags in Liquid-injected initial state and again in JS post-hydration without flicker.

**Negatives / accepted trade-offs**

- Client-side bucketing gives us sample-size skew if visitors clear localStorage frequently (incognito, privacy browsers). Acceptable — we are not running stats-tier experiments here; we are shipping merchant-led UI variants.
- Results analysis requires shipping the flag name as a custom dimension to GA4 ourselves. The web-vitals RUM path from ADR-005 already writes custom dimensions; we piggyback on the same channel (see `assets/feature-flags.js` integration).
- Any sufficiently determined user can set `?kg_ff=` and override; this is fine for UX variants, unsafe for pricing or checkout content. We document the threat model in the module's file header: **do not gate pricing, availability, or checkout logic behind these flags** — use Shopify's native Markets/Discounts instead.
- The bucketing is fixed at first-read. If a merchant raises a rollout percentage from 10% to 50%, only _new_ visitors after that change get rebucketed; the original 10% stay in their assignment. This is the intended behavior (stable experience for returning users) but worth calling out.

## Integration points

- `assets/feature-flags.js` — the module.
- `config/settings_schema.json` → `Feature flags` group (JSON textarea) — merchant-edited flag definitions.
- `layout/theme.liquid` — injects `window.__KG_FF_DEFS__` inline from the `feature_flags_json` setting, then loads `feature-flags.js` in `<head>` with `defer` so `window.KG_FF` is initialized before any body deferred script runs.
- `blocks/pantry-quiz.liquid` + `assets/pantry-quiz.js` — uses `KG_FF.isEnabled('pantry_quiz')` to gate visibility; falls back to merchant block setting if the flag is undefined.
- `assets/theme.js` — dims a `flag_exposure` GA4 event on first read of any flag so experiment lift can be analyzed in GA4 explorations.

## Related decisions

- ADR-002 Vanilla JS + Web Components (why this is a plain module, not a React lib).
- ADR-005 Sentry over Grafana Faro (fail-safe: flag module logs to Sentry if it throws, then falls back to defaults).
