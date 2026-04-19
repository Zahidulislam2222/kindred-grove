# Kindred Grove — Shopify theme

A custom, agency-tier Shopify Online Store 2.0 theme for [Kindred Grove](https://kindred-grove.myshopify.com) — single-origin pantry staples (olive oil, dates, honey, saffron, black seed) sourced direct from family farms across the Mediterranean and Levant.

Built with the [Theme Blocks](docs/adr/001-theme-blocks-over-legacy-sections.md) architecture, vanilla JavaScript with Web Components, and metaobjects-first content. AI-native delivery workflow (Shopify Dev MCP + Claude Code + Claude Design) documented in [`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md).

[![CI — theme-check](https://github.com/Zahidulislam2222/kindred-grove/actions/workflows/theme-check.yml/badge.svg?branch=main)](https://github.com/Zahidulislam2222/kindred-grove/actions/workflows/theme-check.yml)
[![CI — gitleaks](https://github.com/Zahidulislam2222/kindred-grove/actions/workflows/gitleaks.yml/badge.svg?branch=main)](https://github.com/Zahidulislam2222/kindred-grove/actions/workflows/gitleaks.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-olive.svg)](LICENSE)

---

## What's in the box

- **14 storefront templates** — homepage, PLP, PDP (with 3D model-viewer), cart drawer + page, predictive search, origin/farm detail, pantry quiz, recipes-blog-ready, wholesale B2B form, gift cards, customer account, checkout extension, styleguide, 404 + policies.
- **8 CI workflows** — theme-check, Lighthouse CI, axe-core accessibility, Playwright E2E, Percy visual regression, deploy-dev/staging/production, gitleaks. All gate `main`.
- **8 ADRs** documenting every major architectural decision under `docs/adr/`.
- **12 public docs** — architecture, performance, accessibility, security, testing, merchant guide, AI workflow, AI governance, ADRs, metaobject schemas, roadmap, changelog.
- **Zero runtime dependencies.** The theme ships unbundled. `npm install` is only needed to run the test suite.

---

## Quickstart

### Prerequisites

- Node 22+
- [Shopify CLI](https://shopify.dev/docs/themes/tools/cli) 3.93+
- Git

### Install

```bash
git clone https://github.com/Zahidulislam2222/kindred-grove.git
cd kindred-grove
npm install                       # tests + lint only — theme ships unbundled
npx playwright install chromium   # for local E2E / a11y / visual runs
```

### Configure

```bash
cp .env.example .env
# Fill in at least SHOPIFY_STORE_URL + SHOPIFY_THEME_ID_DEV.
# See docs/CI-SECRETS.md for how to mint each credential.
```

### Develop

```bash
shopify theme dev --theme $SHOPIFY_THEME_ID_DEV --store $SHOPIFY_STORE_URL
# → opens a live-reload preview at https://127.0.0.1:9292
```

### Test

```bash
shopify theme check          # Liquid linting
npm run test:e2e             # Playwright golden paths
npm run test:a11y            # axe-core WCAG 2.1 AA
npm run test:visual          # Percy snapshots (needs PERCY_TOKEN)
```

### Deploy

Deploys run from CI on merge to `main` (production) or `staging` branch. No manual pushes to production — see [`docs/CI-SECRETS.md`](docs/CI-SECRETS.md) for environment protection rules.

---

## Project structure

```
kindred-grove/
├── layout/          — theme.liquid (head, CSP, OG, structured data, skip link)
├── templates/       — 14 JSON templates (index, product, collection, cart, quiz, wholesale, origin, styleguide, 404, gift-card, page, search, robots)
├── sections/        — main-* host sections that accept @theme + @app blocks
├── blocks/          — all merchant-composable blocks (hero, farm-story, cart-drawer, wholesale-form, pantry-quiz, predictive-search, etc.)
├── snippets/        — reusable primitives (button, icon, image, form-field, honeypot, all 6 JSON-LD schemas)
├── assets/          — CSS (theme/base/utilities/components) + web-component JS + no build step
├── config/          — settings_schema.json (merchant-editable tokens)
├── locales/         — en.default.json, ar.json (190+ keys each)
├── extensions/      — checkout-trust-badges (scaffolded, separate deploy)
├── scripts/         — dev-store seed + wholesale draft-order Cloudflare Worker
├── tests/
│   ├── e2e/         — Playwright specs (home, collection, pdp, cart, quiz)
│   ├── visual/      — Percy snapshot suite
│   └── a11y/        — axe via Playwright
├── docs/            — 12 public docs + 8 ADRs + metaobject schema reference
└── .github/workflows — 8 CI pipelines
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the deep dive.

---

## Key decisions

| ADR | What | Why |
|---|---|---|
| [001](docs/adr/001-theme-blocks-over-legacy-sections.md) | Theme Blocks architecture | Merchant composability + Horizon parity + 8-level nesting |
| [002](docs/adr/002-vanilla-js-web-components.md) | Vanilla JS + Web Components | Zero runtime deps, portability to Hydrogen |
| [003](docs/adr/003-metaobjects-first.md) | Metaobjects-first content | Reusable farms / certifications / recipes across products |
| [004](docs/adr/004-shopify-dev-mcp.md) | Shopify Dev MCP | Up-to-date Liquid + GraphQL knowledge in the editor |
| [005](docs/adr/005-sentry-over-grafana-faro.md) | Sentry for errors | Free tier, PII scrubbing, CSP friendly |
| [006](docs/adr/006-cloudflare-pages-for-case-study.md) | Cloudflare Pages for case study site | Free, fast, Git-integrated |
| [007](docs/adr/007-playwright-for-e2e.md) | Playwright for E2E | Cross-browser, headless-first, solid Shopify fixtures |
| [008](docs/adr/008-localstorage-feature-flags.md) | localStorage feature flags | Zero infrastructure A/B, DNT compliant |

---

## Documentation index

| Doc | For |
|---|---|
| [MERCHANT-GUIDE.md](docs/MERCHANT-GUIDE.md) | Merchants and content editors |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Developers — rendering model, folder structure |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Developers — setup, test, commit conventions, PR flow |
| [TESTING.md](docs/TESTING.md) | Developers — how to run + add tests, debug failures |
| [ACCESSIBILITY.md](docs/ACCESSIBILITY.md) | Design + QA — WCAG 2.1 AA posture, manual checkpoints |
| [PERFORMANCE.md](docs/PERFORMANCE.md) | Developers — budgets, LCP/CLS strategy, regression playbook |
| [SECURITY.md](docs/SECURITY.md) | Security review — threat model, CSP, form hardening |
| [AI-WORKFLOW.md](docs/AI-WORKFLOW.md) | Internal — prompts, velocity log, session notes |
| [AI_GOVERNANCE.md](docs/AI_GOVERNANCE.md) | Internal — AI-vs-human review boundaries |
| [ROADMAP.md](docs/ROADMAP.md) | Product — Phase 2, 3, 4 plans |
| [CHANGELOG.md](docs/CHANGELOG.md) | Everyone — version history |
| [metaobjects/SCHEMAS.md](docs/metaobjects/SCHEMAS.md) | Merchants + devs — metaobject + metafield definitions |

---

## Quality bars

| Metric | Target | Enforced by |
|---|---|---|
| Lighthouse — Performance | ≥ 0.90 | CI (blocking) |
| Lighthouse — Accessibility | ≥ 0.95 | CI (blocking) |
| axe-core violations | 0 | CI (blocking) |
| Theme-check offenses | 0 | CI (blocking) |
| Playwright golden paths | 5/5 passing | CI (blocking) |
| Percy visual regressions | All reviewed | CI (blocks on un-reviewed diffs) |
| Gitleaks findings | 0 real | CI (blocking) |
| Sentry errors at ship | 0 | Manual pre-ship gate |

---

## License

MIT — see [`LICENSE`](LICENSE). This theme is open for study, fork, and adaptation. The brand identity, copy, and images are © Kindred Grove.

---

## Acknowledgements

Built by [Anderson Collaborative](https://example.com) — AI-native Shopify practice. Delivery workflow is Shopify Dev MCP + Claude Code + Claude Design; velocity notes in [`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md).
