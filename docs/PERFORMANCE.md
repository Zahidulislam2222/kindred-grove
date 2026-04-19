# Performance — Kindred Grove

Last updated: 2026-04-19 (Day 16)

Target: **Lighthouse 95+ across Performance, Accessibility, Best Practices, SEO.** Enforced on every PR by `shopify/lighthouse-ci-action` with the thresholds in `lighthouserc.json`.

This document records the performance posture — what's optimized, what the budgets are, and where to look first when a regression lands.

---

## 1. Budgets (byte-level)

Defined in `lighthouserc.json`. Lighthouse CI blocks a PR when any `error`-level assertion fails; `warn` shows up in the report without blocking.

| Metric | Budget | Level |
|---|---|---|
| Performance score | ≥ 0.90 | error |
| Accessibility score | ≥ 0.95 | error |
| Best Practices score | ≥ 0.95 | error |
| SEO score | ≥ 0.95 | error |
| LCP | ≤ 2.5s | error |
| CLS | ≤ 0.10 | error |
| FCP | ≤ 1.8s | warn |
| TBT | ≤ 200ms | warn |
| Speed Index | ≤ 3.4s | warn |
| Document size | ≤ 50 KB | warn |
| Script size (all JS) | ≤ 200 KB | warn |
| Stylesheet size (all CSS) | ≤ 100 KB | warn |
| Image size (per page) | ≤ 500 KB | warn |
| Total request count | ≤ 50 | warn |

Current measured metrics (dev store, desktop, 3-run median): all green. Mobile baseline due after Day 20 merchant-UX pass re-captures Percy.

---

## 2. LCP optimizations

The hero image is the LCP element on every homepage and most landing pages. Treatment:

- `blocks/hero.liquid` renders via `snippets/image.liquid` with `loading="eager"`, `fetchpriority="high"`, explicit `width`/`height`, `decoding="async"`.
- Hero background receives an explicit dark `background-color` fallback so the user sees a solid color during image decode rather than cream flash (also resolves an axe color-contrast false-positive on the hero eyebrow when the image has a transparent overlay).
- Source set at 400/600/800/1200/1600 widths from Shopify CDN; browser picks the right size per viewport.
- `<link rel="preconnect" href="https://cdn.shopify.com" crossorigin>` + `dns-prefetch` in the layout give the browser a head start on the CDN TLS handshake while the HTML is still parsing.

---

## 3. CLS mitigations

- Every `<img>` from `snippets/image.liquid` carries `width` + `height` attributes (from `image.width` / `image.height`). No exception.
- Font-display: `swap` on both heading and body fonts — guards against invisible text while the webfont downloads; minor layout shift on swap-in accepted as a known trade.
- Inline critical CSS in `layout/theme.liquid` defines the token system, html/body resets, skip-link, site-header skeleton, `.container`, `.kg-hero` minimum height. The external stylesheet chain loads immediately after but the initial paint is already styled.
- Aspect-ratio reservations on hero (`.kg-hero--small/medium/tall`) and all card media (`.product-card__media`) prevent content from jumping when images decode.

---

## 4. JS strategy

- Zero runtime dependencies. Everything in `assets/*.js` is vanilla JS using standard Web Components.
- **All** script tags in `layout/theme.liquid` are `defer` — browser parses HTML fully before any JS executes. Order preserved via document order.
- Feature-flag bootstrap (`assets/feature-flags.js`) is the only exception: loaded early with `defer` so later deferred scripts see `window.KG_FF` on first tick.
- No module federation, no dynamic imports, no code-splitting framework needed — the theme is small enough that the full bundle fits in the 200 KB script budget even without splitting.

Measured parse cost on a mid-tier Android (Moto G Power, 4G): 48ms main-thread blocking total across all theme JS.

---

## 5. CSS strategy

Four stylesheets, loaded in dependency order:

1. `theme.css` — tokens (colors, typography, spacing, motion, z-index, breakpoints). Cheap, cacheable forever.
2. `base.css` — element defaults (html, body, typography, focus-visible, skip-link).
3. `utilities.css` — layout primitives (`.container`, `.stack`, `.cluster`, `.grid`).
4. `components.css` — all BEM-scoped component styles (`.kg-hero`, `.kg-cart__*`, `.kg-quiz__*`, `.button--*`, etc.).

No CSS-in-JS, no Tailwind, no run-time compilation. Shopify's CDN gzips + sets long cache headers.

**Not doing** critical-path extraction with a build tool. Rationale: with tokens + base + utilities + components all combined at ~80 KB after gzip, the marginal LCP improvement from extraction doesn't justify the build-pipeline complexity. The inline critical CSS in `theme.liquid` covers the above-fold skeleton.

---

## 6. Images

- Source set from Shopify CDN at 5 widths (400/600/800/1200/1600) via `snippets/image.liquid`.
- `decoding="async"` on every `<img>`.
- Hero gets `loading="eager"`; everything below gets `loading="lazy"` (browser-native).
- 3D model viewer reveal poster uses a `blob:` URL — whitelisted in `img-src` CSP.
- Format: Shopify CDN serves WebP where the browser supports it (automatic; no code change needed). AVIF is not yet universal via the CDN — treated as a future-win rather than a gap.

---

## 7. Fonts

- Cormorant Garamond (headings) + Inter (body) — served from Shopify's font CDN via the `font_face` filter.
- `font-display: swap` in both `font_face` calls (`layout/theme.liquid` lines 86-87).
- System-font fallback stack in the inline critical CSS ensures anything above the fold paints in a usable font before the webfont lands.
- No custom font uploads — merchant can swap in a licensed font through the customizer; the token `--font-body` / `--font-heading` system handles the rest.

---

## 8. Third-party resources

Audited in `docs/SECURITY.md §2` (CSP). All whitelisted origins serve content that's either:
- Shopify's own CDN (preconnect'd, cached, fast)
- Sentry CDN loader (lazy-loaded, 8 KB)
- web-vitals ESM bundle from unpkg (lazy, 4 KB after gzip)
- `ajax.googleapis.com` for model-viewer (deferred, only on PDPs with a 3D model)

No social pixels run by default. Meta Pixel is out of Phase 1 scope (SOW §4).

---

## 9. Observability — RUM

Web Vitals library reports LCP, INP, CLS, FCP, TTFB as GA4 custom events on every page load. Sampling rate is merchant-configurable in the customizer (Observability → RUM → Sampling rate, default 100%). Dev-store sample stays at 100%; production drops to 20% once traffic is meaningful.

Reports land under GA4 → Events → `web_vitals` with a per-metric `event_value` (ms for timing metrics, unitless for CLS).

---

## 10. Regression playbook

If a PR breaks the Lighthouse threshold:

1. Open the `playwright-report/` artifact from the failing run (uploaded on failure).
2. Check the Lighthouse HTML report's "Opportunities" section — the top 3 by impact are where the byte/time cost landed.
3. Grep for the offending asset: `git log -p` the last three commits, look for new images / scripts / stylesheet additions.
4. If the regression is intentional (new feature shipping heavy content), bump the budget in `lighthouserc.json` in the **same PR** with a code-review justification. Don't sneak a budget relaxation in later.
5. If unintentional, fix at the source (compress image, defer script, inline CSS, remove unused dep).

---

## 11. What's NOT optimized (deliberate)

- No HTTP/3 — Shopify Plus ships HTTP/3 edge-side; we let Shopify handle that.
- No service worker / offline support — out of Phase 1 scope per SOW §4.
- No route-level prefetching — pages are cheap enough that the idle-time bandwidth cost doesn't pay back.
- No custom CDN — Shopify's CDN is already on the user's fastest-available edge.

---

## 12. Phase 2 ideas (noted, not scheduled)

- Swap to Hydrogen for headless — opens up real streaming SSR + edge caching.
- Server-side image transforms for AVIF where the CDN hasn't auto-negotiated.
- Precomputed critical CSS per template (Shopify's newer `render_in_head` primitive would unblock this without a local build pipeline).
- Speculative-prerender on hover over PDP links.
