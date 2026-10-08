# ADR-002 — Vanilla JavaScript and Web Components

**Status:** Accepted for the native theme; current scope clarified 2026-10-08. Original decision dated 2026-04-19.

## Decision and rationale

Use Liquid server-rendered markup with vanilla JavaScript Web Components for browser enhancements. The theme ships unbundled assets through Shopify; no React SPA runtime or separate rendering server is needed for its current behavior. Merchant content and section composition stay in native settings, locales, products and Pages.

Component lifecycle boundaries make listener/read cleanup, reconnection and bounded state explicit. Native links/forms remain useful without JavaScript where the platform supports them. Cross-component events preserve the existing cart/header integration without introducing a separate global application state store.

## Current consequences

The repository has no standalone theme type checker, JS/CSS linter or bundler build. Liquid validation uses Theme Check; source/security regressions and real browser checks remain separate gates. Performance/accessibility workflows require explicit configured access and are not verified as every-PR enforcement. Theme telemetry loaders and callbacks are removed; optional storage follows the native privacy boundary. No compulsory Hydrogen migration, GA4 or Sentry activation is part of the current roadmap.

No source-map upload, third-party runtime, paid tracking or framework dependency is introduced by this decision. Any future architecture proposal must solve a measured requirement and qualify its privacy, performance, security, operations and cost.

## Historical context

Earlier planning associated this choice with automatic Lighthouse budgets, later Hydrogen work and telemetry. Those were planning assumptions, not current delivered services. The maintained release/CI records take precedence. Keep the accepted Shopify-native architecture for this handoff.

[Architecture](../ARCHITECTURE.md), [privacy](../PRIVACY.md), [performance](../PERFORMANCE.md), [testing](../TESTING.md), [roadmap](../ROADMAP.md).
