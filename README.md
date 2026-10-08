# Kindred Grove

Documentation updated: 2026-10-08.

Maintained by **Zahidul Islam**. [Published storefront](https://kindred-grove.zahidul-islam.com) · [Current release PR](https://github.com/Zahidulislam2222/kindred-grove/pull/8) · [Full documentation](docs/README.md).

Visitors enter the separately shared storefront password. Shopify explicitly supports giving this visitor password to reviewers; it must differ from the administrator's password and stays out of source, issues and public documents. This is the accepted current access model. [Access guide](docs/STOREFRONT-ACCESS.md).

A Shopify pantry storefront with a cinematic, scroll-synchronized homepage, warm cream/terracotta styling, merchant-editable content and native shopping and enquiry flows. Built with Liquid, CSS and vanilla JavaScript Web Components; Shopify provides catalog, cart, hosted rendering and checkout services.

**Current delivery, 2026-10-08:** The theme and seven native content pages are published on the existing Shopify development store, with verified shopping and form controls behind its password gate. **Public launch is incomplete:** anonymous visitors to [kindred-grove.zahidul-islam.com](https://kindred-grove.zahidul-islam.com) see Shopify’s enforced password page. The domain and SSL are connected. Authenticated verification passed 56 browser checks; this does not prove public access. [Shopify’s dev-store restrictions](https://shopify.dev/docs/apps/build/stores/development-stores) prohibit removing the gate or converting a dev store to production. Public commerce requires an eligible production store and a separately reviewed migration.

## Experience and verified behavior

- Cinematic hero with left-side copy changing with the film's chapters in both scroll directions; pause and reduced-motion behavior.
- Header hides during downward scrolling and returns when scrolling up, focusing navigation, or opening a menu/dialog.
- Product and collection browsing, pantry interactions, quick view and a native Shopify cart drawer with quantity and removal controls.
- Native prices, cart, checkout controls, contact, wholesale and newsletter forms. Real-order processing remains restricted by the Shopify development-store plan.
- Our Story, Recipes, FAQ, Contact, Shipping & Returns, Find Your Pantry and Wholesale pages with shared navigation.
- Native consent controls, purpose-gated optional storage and a memory-only pantry quiz. Theme telemetry loaders are removed.
- Responsive layouts, keyboard/focus behavior, mobile navigation without JavaScript and English/Arabic locale source.

Historical Phase 2 evidence: **95/95 security/configuration tests**, **41 browser passes, 0 failures, 5 documented skips**, separate Quiz/Wholesale functional **2/2** and active axe **2/2**, and **150/150 exact local/artifact/development file hashes**. Theme Check reported **0 errors and 2 existing warnings**. See [testing](docs/TESTING.md) for scope, skips and manual checks still needed.

Canonical Quiz and Wholesale pages are now configured; their native resources are separate from theme templates. No test article is configured. Shopify-hosted accounts, checkout and app processing remain platform boundaries. The checkout extension is a [legacy, unsupported reference implementation](extensions/checkout-trust-badges/README.md), not a delivered checkout feature.

## Architecture and backend

```mermaid
flowchart LR
    Visitor --> Theme[Liquid storefront and Web Components]
    Theme --> CDN[Shopify CDN: public assets]
    Theme --> Cart[Shopify Ajax: visitor cart]
    Theme --> Privacy[Shopify native consent]
    Cart --> Checkout[Shopify hosted checkout]
    Merchant[Merchant configuration and catalog] --> Theme
    Source[Reviewed source and tests] --> Preview[Development verification]
    Preview --> Release[Separate controlled live release]
```

This repository includes the frontend, Liquid server-rendered templates, test/CI tooling, a projected-capacity model and the retired wholesale Worker source. There is no separate project database or active custom commerce server. The Worker returns HTTP 410 without Admin API side effects; the seed script validates offline example data and rejects remote writes. See [architecture](docs/ARCHITECTURE.md) and [ADR 009](docs/adr/009-retire-wholesale-admin-proxy.md).

## Future scale and reliability

The engineering roadmap targets **10k → 100k → 1M+ simultaneous visitors** and a **99% rolling availability objective**. [Scalability](docs/SCALABILITY.md) gives workload equations, CDN/page/cart/checkout boundaries, bottlenecks, stage gates and conditional backend designs. [Operations](docs/OPERATIONS.md) defines SLIs, error budgets, monitoring, response, recovery and rollback. These documents describe how to qualify each stage, including platform capacity confirmation and representative testing.

The current free/local work introduces no paid service. Future infrastructure and platform entitlements are decisions to price and approve at the relevant stage. A native Shopify architecture is retained until measured requirements justify another service or a headless migration.

## Setup

Use Git and the Node/Shopify CLI/scanner versions maintained in [`scripts/config/toolchain.json`](scripts/config/toolchain.json).

```sh
git clone https://github.com/Zahidulislam2222/kindred-grove.git
cd kindred-grove
npm ci --no-audit --no-fund
npx playwright install chromium
cp .env.example .env
```

Configure the intended store, development theme, browser base/preview URL and optional storefront password in the ignored environment file. See [configuration ownership](docs/CONFIGURATION.md); do not paste credentials into commands or tracked files. The theme renders without npm runtime dependencies; npm installs the test harness.

```sh
# Local source gates; Gitleaks must be available on PATH or GITLEAKS_BIN.
node --test tests/security/*.test.cjs
shopify theme check --fail-level=error

# Actual browser verification on an explicitly configured development target.
node --env-file=.env node_modules/@playwright/test/cli.js test tests/e2e tests/a11y --project=chromium
```

Use `shopify theme dev` only after explicitly configuring the intended store/theme and loading its environment: the watcher uploads edits automatically. For releases, freeze the reviewed artifact, compare remote state before writing, then pull and compare hashes. [Release guide](docs/RELEASE.md).

## Documentation

| Need | Start here |
|---|---|
| Complete public documentation navigation | [Documentation index](docs/README.md) |
| Source structure, service ownership and decisions | [Architecture](docs/ARCHITECTURE.md), [ADRs](docs/adr/001-theme-blocks-over-legacy-sections.md) |
| Backend contracts, failures and future integrations | [Backend](docs/BACKEND.md) |
| Full delivery, legal and operating requirements | [Project requirements](docs/PROJECT-REQUIREMENTS.md) |
| Developer onboarding and configuration | [Contributing](CONTRIBUTING.md), [Configuration](docs/CONFIGURATION.md) |
| Security, privacy and storefront controls | [Security](docs/SECURITY.md), [Privacy](docs/PRIVACY.md), [Storefront mode boundaries](docs/STOREFRONT-ACCESS.md) |
| US/EU requirements and commercial launch prerequisites | [Compliance research](docs/COMPLIANCE-RESEARCH.md) |
| Future 1M+ visitor architecture and 99% availability | [Scalability](docs/SCALABILITY.md), [Operations](docs/OPERATIONS.md) |
| Performance and accessible interactions | [Performance](docs/PERFORMANCE.md), [Accessibility](docs/ACCESSIBILITY.md) |
| Actual checks, known defects and publication | [Testing](docs/TESTING.md), [Defect log](DEFECT-LOG.md), [Release](docs/RELEASE.md) |
| Merchant editing and truthful product content | [Merchant guide](docs/MERCHANT-GUIDE.md), [Media provenance](docs/MEDIA-PROVENANCE.md), [Metaobjects](docs/metaobjects/SCHEMAS.md) |
| Milestones and maintenance | [Build plan](BUILD-PLAN.md), [Roadmap](docs/ROADMAP.md), [Changelog](docs/CHANGELOG.md) |
| Responsible assisted development | [AI workflow](docs/AI-WORKFLOW.md), [Governance](docs/AI_GOVERNANCE.md) |

## Repository layout

`layout`, `templates`, `sections`, `blocks` and `snippets` contain Liquid composition. `assets` contains styles, components and editorial media. `config` and `locales` own merchant settings and translated copy. `scripts` contains configuration, CI, offline catalog and capacity tools. `tests` contains committed automated regressions. `.github` contains workflow definitions. `extensions` contains the isolated legacy checkout example.

Private recovery records, credentials, local research, browser artifacts and client document exports are excluded from the public repository. Public documentation is written for developers, merchants and clients, without access details or customer information.

## License and content rights

Code is provided under [MIT](LICENSE), except where a component explicitly states otherwise. The extension reference implementation declares its own license status. Product facts, brand identity and third-party media are separate from the code license. Consult [media provenance](docs/MEDIA-PROVENANCE.md) before reuse; current imagery/video rights are not established by the presence of files in Git.
