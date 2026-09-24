# Documentation guide

Start with the [project README](../README.md) for the delivered storefront and [build plan](../BUILD-PLAN.md) for acceptance and milestones. This collection serves clients, merchants and developers; it connects present implementation to a practical future growth plan.

| Topic | Documents | What to find |
|---|---|---|
| Architecture and frontend | [Architecture](ARCHITECTURE.md), [design system](design-system/DESIGN-SYSTEM.md) | Rendering, native backend ownership, components, visual vocabulary |
| Setup and change ownership | [Contributing](../CONTRIBUTING.md), [configuration](CONFIGURATION.md) | Commands, settings, secrets, tool versions and runtime boundaries |
| Security and data | [Security](SECURITY.md), [privacy](PRIVACY.md), [demo safety](DEMO-SAFETY.md) | Threats, controls, consent, retention, platform responsibilities |
| US/EU legal preparation | [Requirements register](COMPLIANCE-RESEARCH.md) | Triggers, primary sources, evidence owners, rights and launch requirements |
| Large traffic | [Scalability](SCALABILITY.md) | 10k/100k/1M+ concurrent visitors, workload model, bottlenecks and validation stages |
| Availability and recovery | [Operations](OPERATIONS.md), [release](RELEASE.md) | 99% objective, indicators/error budget, incidents, backups, rollback and safe publication |
| Quality | [Testing](TESTING.md), [accessibility](ACCESSIBILITY.md), [performance](PERFORMANCE.md), [defects](../DEFECT-LOG.md) | Actual checks, manual work, budgets and corrected failures |
| Merchant operations | [Merchant guide](MERCHANT-GUIDE.md), [metaobjects](metaobjects/SCHEMAS.md), [media provenance](MEDIA-PROVENANCE.md) | Editable content, SKU/claim evidence, source/rights records |
| Delivery and future work | [Roadmap](ROADMAP.md), [build plan](../BUILD-PLAN.md), [changelog](CHANGELOG.md) | Milestones, dependencies, acceptance and historical changes |
| Assisted development | [Workflow](AI-WORKFLOW.md), [governance](AI_GOVERNANCE.md) | Bounded delegation, independent review, authorization and evidence |
| Checkout example | [Legacy extension README](../extensions/checkout-trust-badges/README.md) | Unsupported scaffold, compatibility gap and future migration gate |

## Architecture decisions

- [001 Theme Blocks](adr/001-theme-blocks-over-legacy-sections.md)
- [002 Vanilla JavaScript and Web Components](adr/002-vanilla-js-web-components.md)
- [003 Metaobjects](adr/003-metaobjects-first.md)
- [004 Development tooling](adr/004-shopify-dev-mcp.md)
- [005 Historical telemetry decision, superseded](adr/005-sentry-over-grafana-faro.md)
- [006 Optional case-study hosting proposal](adr/006-cloudflare-pages-for-case-study.md)
- [007 Playwright](adr/007-playwright-for-e2e.md)
- [008 Consent-gated feature assignments](adr/008-localstorage-feature-flags.md)
- [009 Retired wholesale proxy](adr/009-retire-wholesale-admin-proxy.md)

ADRs preserve decision context. Current implementation/status in the main engineering documents takes precedence over historical examples or proposed integrations. Client Google Docs/PDFs are maintained separately and are not part of public Git source. Private credentials, internal business documents and investigation logs are deliberately excluded.
