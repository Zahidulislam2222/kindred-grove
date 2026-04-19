# Changelog

All notable changes to this theme are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses day-tagged versions during the Phase 1 build sprint (`v0.0-day1` … `v0.0-day21`). Semantic versioning kicks in at Phase 1 handover (`v1.0.0`).

---

## [v0.0-day21] — 2026-04-19 — Documentation sprint

### Added

- `README.md` — top-level project overview, quickstart, structure, ADR index, quality bars.
- `CONTRIBUTING.md` — dev onboarding, branch flow, code conventions, AI-assist policy.
- `docs/CHANGELOG.md` (this file).
- `docs/ROADMAP.md` — Phase 2 (Hydrogen), Phase 3 (custom app), Phase 4 (real A/B infra), Phase 5 (Shopify Plus).
- `docs/AI_GOVERNANCE.md` — review boundaries, prompt logging rules, human-gate policy.

### Changed

- `docs/ARCHITECTURE.md` — refreshed to reflect Day 11-20 additions (wholesale, origins, predictive search, Klaviyo wiring, schema suite, performance budgets, gitleaks CI).

## [v0.0-day20] — 2026-04-19 — Merchant UX + MERCHANT-GUIDE.md

- `docs/MERCHANT-GUIDE.md` — 16-section handoff doc for merchants and content editors.
- Block-schema polish verified across all ~30 blocks (every block has label + info + defaults).

## [v0.0-day19] — 2026-04-19 — Security hardening

- `.github/workflows/gitleaks.yml` + `.gitleaks.toml` — PR/push/scheduled secret scanning with project allowlist.
- `docs/SECURITY.md` §7 updated — gitleaks documented, Day-19 TODO resolved.
- CSP reviewed; nonce-based tightening deferred to Phase 2 (Shopify platform constraint).

## [v0.0-day18] — 2026-04-19 — SEO + JSON-LD schema suite

- `snippets/schema-organization.liquid` — rendered on every page.
- `snippets/schema-breadcrumb.liquid` — auto-built per template.
- `snippets/schema-faq.liquid` — gated on non-empty items.
- `snippets/schema-article.liquid` — blog articles.
- `snippets/schema-recipe.liquid` — recipe metaobject detail.
- `snippets/schema-product.liquid` already had AggregateRating hook (Day 12).

## [v0.0-day17] — 2026-04-19 — i18n + RTL

- `locales/ar.json` — full Arabic translation (180+ keys, CLDR-correct plurals).
- `layout/theme.liquid` — hreflang loop over `shop.published_locales` + x-default.
- RTL foundation verified (typography swap, logical properties throughout).

## [v0.0-day16] — 2026-04-19 — Performance pass

- Inline ~2KB critical CSS in `<head>` — tokens, skip-link, header + hero skeleton.
- `dns-prefetch` for Shopify CDN in addition to `preconnect`.
- `lighthouserc.json` — per-metric budget assertions (LCP ≤ 2.5s, CLS ≤ 0.1, byte budgets).
- `docs/PERFORMANCE.md` — full posture doc.

## [v0.0-day15] — 2026-04-19 — Accessibility doc

- `docs/ACCESSIBILITY.md` — WCAG 2.1 AA commitment, contrast table, documented third-party axe exclusions, manual-audit playbook.

## [v0.0-day14] — 2026-04-19 — Testing doc

- `docs/TESTING.md` — full reference for the 5 PR-gating test workflows; debug playbook; how to add new specs per surface.

## [v0.0-day13] — 2026-04-19 — Analytics verification (no code changes)

- No theme-code changes. GA4 + Web Vitals + custom events (`quiz_complete`, `flag_exposure`, `newsletter_subscribed`, etc.) were wired Day 2–12. Verification requires the user to run Google Tag Assistant in the browser.

## [v0.0-day12] — 2026-04-19 — Predictive search + Klaviyo + Review schema

### Added

- `blocks/predictive-search.liquid` + `assets/predictive-search.js` — debounced live search with full keyboard nav.
- `assets/newsletter.js` — progressive Klaviyo subscribe with /contact fallback.
- `snippets/schema-product.liquid` — AggregateRating driven by Judge.me metafields.

### Changed

- `blocks/newsletter.liquid` upgraded to `<kg-newsletter>` web component.
- `config/settings_schema.json` — Klaviyo public API key setting.
- `layout/theme.liquid` — CSP `connect-src` extended for Klaviyo.

## [v0.0-day11] — 2026-04-19 — Wholesale + Origins + SECURITY.md

### Added

- `templates/page.wholesale.json` + `sections/main-wholesale.liquid` + `blocks/wholesale-form.liquid`.
- `snippets/form-honeypot.liquid`, `assets/wholesale-form.js`, `scripts/wholesale-draft-order-worker.js`.
- `templates/page.origin.json` + `sections/main-origin.liquid` — metaobject-driven farm detail.
- `docs/SECURITY.md` — threat model + CSP + form hardening + scope minimization.
- `.github/dependabot.yml`.

### Changed

- `docs/metaobjects/SCHEMAS.md` — page metafield definitions for origin pages.

## [v0.0-day10] — 2026-04-19 — Pantry quiz + feature flags + CI verification

### Added (Day 10 feature work)

- `blocks/pantry-quiz.liquid`, `assets/pantry-quiz.js` — merchant-editable 5-question persona quiz.
- `assets/feature-flags.js` — FNV-1a bucketing, URL override, DNT compliance.
- `docs/adr/008-localstorage-feature-flags.md`.

### Added (Day 10 audit-fix)

- `package-lock.json`, `scripts/seed-dev-store.mjs`.
- `tests/a11y/axe.spec.ts` replacing axe-core CLI.
- `@axe-core/playwright` devDep.

### Changed (Day 10 audit-fix)

- WCAG AA contrast: `.eyebrow`, `.button--primary`, `.product-card__price`, `.search__price` switched from olive (`#6B7F47`, 4.02:1) to deeper olive (`#576839`, 5.76:1).
- `sections/main-collection.liquid:56` — Liquid syntax fix (pipe filter in if).
- `config/settings_schema.json` — font_picker default changed from `cormorant_garamond_n4` to `assistant_n4` (valid Shopify font).
- `tests/e2e/cart.spec.ts` + `pdp.spec.ts` — defensive skip on bot-protection 401.
- CI plumbing: `--theme <name>` flag added to every `shopify theme push`; auth.ts visits full PREVIEW_URL first.

## [v0.0-day9] — 2026-04-19 — Cart drawer + checkout extension

- `blocks/cart-drawer.liquid`, `cart-free-ship-bar.liquid`, `cart-item-list.liquid`, `cart-upsell.liquid`, `cart-gift-note.liquid`.
- `assets/cart-drawer.js` — `<kg-cart-drawer>` web component.
- `templates/cart.json` + `sections/main-cart.liquid` — no-JS-functional cart page.
- `extensions/checkout-trust-badges/` — checkout UI extension scaffold.

## [v0.0-day8] — 2026-04-19 — PDP part 2

- Farm-story, certifications, recipe-suggestions blocks (metaobject-driven).
- Product-FAQ accordion, recently-viewed, recommendations.
- Model-viewer integration.
- `docs/adr/003-metaobjects-first.md`.

## [v0.0-day7] — 2026-04-19 — PDP part 1

- `templates/product.json` + `sections/main-product.liquid`.
- Gallery, variant picker, ATC, price display blocks.
- `snippets/schema-product.liquid`.

## [v0.0-day6] — 2026-04-19 — Collection page

- `templates/collection.json` + `sections/main-collection.liquid`.
- Filter blocks (availability, list, price), sort, quick-view modal.

## [v0.0-day5] — 2026-04-19 — Homepage

- Hero, values-strip, featured-collections, farm-story, reviews-carousel, newsletter, instagram-strip blocks.
- `docs/adr/002-vanilla-js-web-components.md`.

## [v0.0-day4] — 2026-04-19 — Header + footer + styleguide

- `sections/header.liquid` + `footer.liquid` + mobile drawer.
- Announcement bar, Styleguide page.
- First Percy baseline.

## [v0.0-day3] — 2026-04-19 — CI/CD pipeline

- Lighthouse CI, deploy-dev/staging/production workflows.
- Sentry wiring, Web Vitals → GA4 RUM skeleton.
- `docs/adr/004-shopify-dev-mcp.md`, `docs/adr/005-sentry-over-grafana-faro.md`.

## [v0.0-day2] — 2026-04-19 — Theme scaffolding

- Full folder structure (sections/blocks/snippets/templates/config/locales/assets).
- Layout with CSP, skip link, token injection, canonical, OG + Twitter cards.
- Four CSS files (theme/base/utilities/components).
- `docs/adr/001-theme-blocks-over-legacy-sections.md`, `docs/ARCHITECTURE.md`.
- `.github/workflows/theme-check.yml`.

## [v0.0-day1] — 2026-04-19 — Setup + brand + MCP

- Dev store, Shopify CLI, Node 22, Theme Check installed.
- Shopify Dev MCP configured, connected to Claude Code.
- Three theme environments on dev store.
- Brand brief, fictional SOW, AI-workflow log scaffolded.
- Design system (tokens, colors, typography) generated directly by Claude Code.

---

## Version tagging policy

- `v0.0-dayN` — per-day sprint checkpoints during Phase 1 build.
- `v1.0.0` — Phase 1 handover (feature-complete, CI green, docs final).
- `v1.1.0`, `v1.2.0` — Phase 1 iterations post-launch.
- `v2.0.0` — Phase 2 Hydrogen migration kickoff (see `docs/ROADMAP.md`).
