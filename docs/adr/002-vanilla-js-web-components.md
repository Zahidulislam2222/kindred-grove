# ADR-002 — Vanilla JavaScript + Web Components over Alpine / React

**Status:** Accepted
**Date:** 2026-04-19 (Day 5)
**Deciders:** Zahidul Islam (developer) on behalf of the Kindred Grove engagement

---

## Context

Kindred Grove ships interactive UI inside a Shopify theme: mobile drawer, announcement-bar dismissal, build-your-pantry quiz, cart drawer, predictive search, quick-view modal, recently-viewed, feature-flag system, web-vitals reporting, and a handful of smaller interactions. All of that has to run inside the asset pipeline of a classic Shopify theme — meaning a handful of files in `assets/`, served flat by the Shopify CDN, referenced by Liquid-emitted `<script>` tags, with no Node build step and no JS bundler.

The realistic framework choices for that shape of project in 2026 are:

1. **Vanilla JavaScript + Web Components.** Native class-based custom elements. State lives on instance fields or `dataset`. Templating is either the DOM the element was hydrated with (progressive enhancement) or `innerHTML`/`<template>` cloning. Zero runtime.
2. **Alpine.js.** Small (~15 KB gzip), HTML-first directive model (`x-data`, `x-show`, `x-on`). Declarative, no build step, loads from a CDN, popular in the Shopify Dawn / Horizon adjacent community.
3. **Hotwire / Stimulus.** Similar to Alpine in weight; pairs well with server-rendered HTML.
4. **A real SPA framework (React, Vue, Svelte, Preact).** Requires a bundler, means shipping a framework runtime as part of the theme, and loses the progressive-enhancement story that Shopify themes are designed for.

The constraint set for this decision:

- **Lighthouse budget in CI.** `lighthouse-ci.yml` enforces perf >= 0.9 and a11y >= 0.95 on every PR (Day 3). Every KB of runtime JS is scrutinized. A 40 KB framework runtime consumes budget the theme has better uses for (images, fonts, hero video).
- **Shopify asset pipeline.** The theme has no bundler, no Webpack/Vite/esbuild step. Adding one is possible via a pre-push build but introduces a build-output mismatch where Liquid-rendered HTML references bundle hashes. We explicitly chose to avoid that complication for Phase 1 (Hydrogen is the bundler story in Phase 2).
- **AI-agent readability.** Claude Code is writing most of this JS. A vanilla Web Component is 40 lines of code the agent can hold in context and reason about cleanly; an Alpine directive-heavy template mixes behavior into Liquid-rendered HTML where the boundaries are fuzzier; a React component tree invites the agent to reach for libraries we don't want.
- **Merchant editability.** Theme Blocks give merchants flexible layouts; adding a JS-framework-driven block shape would constrain what merchants can compose in the theme editor.
- **Source-map story.** Sentry ingests source maps cleanly from a bundler output. Vanilla files shipped as-is have no map — acceptable given Phase 1 is small-surface-area code (per ADR-005).

## Decision

**We build all client-side behavior in Kindred Grove Phase 1 as vanilla JavaScript, preferring the Web Components pattern (`class extends HTMLElement`, `customElements.define`) whenever an interaction has any state or lifecycle.** No Alpine. No Stimulus. No React/Vue/Svelte.

Operationally:

- Each interactive element that has state gets a custom element (`<kg-header>`, `<kg-announcement>`, and future `<kg-quiz>`, `<kg-cart-drawer>`, `<kg-predictive-search>`, etc.). The tag is the component boundary.
- Components progressively enhance server-rendered Liquid HTML — the Liquid DOM is the component's initial state, not a placeholder.
- Cross-component communication uses standard CustomEvents, bubbled on the element. No central store.
- Each component is a single file in `assets/` and loaded via a deferred `<script>` in layout/theme.liquid. No bundler, no imports between components at build time. Runtime `import()` is allowed when it materially reduces initial page cost (see Day 3 web-vitals lazy load).
- Shared utilities (debounce, focus-trap, money formatter) live as small modules in `assets/` and are `import()`-ed dynamically by components that need them.

## Consequences

### Positive

- **Zero runtime cost.** No framework bytes on initial page load. The mobile-drawer component (Day 4) is ~1.6 KB unminified. Announcement-bar is ~1 KB. Every byte is ours.
- **Progressive enhancement is free.** If JS fails to load — ad-blocker, flaky network, adversarial browser — the Liquid-rendered DOM is still a usable page. Dropdowns fall back to hover-only CSS, links still navigate, the announcement bar shows without dismiss.
- **Platform longevity.** Custom Elements v1 is a shipped, stable web standard across all evergreen browsers. No framework upgrade path, no churn.
- **Lighthouse-friendly.** Perf budget holds naturally instead of being fought for.
- **AI-agent-friendly.** The agent writes small, self-contained files the reviewer can audit in a single read. No framework idioms to learn or get wrong.
- **Theme-editor respect.** Merchants compose layouts freely without JS assuming a container shape — the component adapts to whatever DOM the merchant configured.
- **Clean Sentry story.** A thrown error maps to a single-file stack trace, not a component tree abstracted through a virtual DOM.

### Negative / accepted tradeoffs

- **More boilerplate than Alpine.** A simple toggle is ~15 lines of vanilla JS vs. `x-data="{ open: false }" @click="open = !open"` in Alpine. We accept this cost because the boilerplate is readable, reviewable, and isolated per file.
- **No JSX-style templating.** Dynamic HTML is built via `<template>` + `cloneNode` or hand-written `innerHTML`. The XSS risk on `innerHTML` is manageable given we never interpolate user-controlled strings — all dynamic content comes from Liquid-rendered attributes or escaped API responses.
- **Manual state management.** No stores, no reducers. Each component owns its state. Cross-component coordination is CustomEvents. This is fine at Kindred Grove's complexity; it would creak at a much larger app — which is the Phase 2 Hydrogen story, not a Phase 1 problem.
- **Limited reactive sugar.** No computed properties, no automatic DOM diffing. When state changes, the component imperatively updates the relevant DOM nodes. For the interactions this theme has, that's a line or two per mutation.
- **Verbose event wiring.** `button.addEventListener('click', this._onClick)` is more typing than `@click="..."`. Accepted.

### Neutral

- Third-party Shopify apps that inject their own JS (Judge.me, Klaviyo, Shopify Subscriptions) work identically whether our own JS is vanilla or framework — they never interact directly with our components.
- Type safety: we're writing `.js`, not `.ts`. Acceptable for the surface area; if any component grows past ~200 LOC we revisit. The risk is bounded by the CI suite (theme-check, axe, Lighthouse) catching gross regressions.

## Alternatives considered

1. **Alpine.js.** Fast start, good ergonomics. Rejected because (a) adding any framework runtime eats the Lighthouse budget we explicitly sized for images and fonts, (b) Alpine directives blur the line between Liquid templating and client-side behavior in a way that's harder for the agent to reason about cleanly, (c) Alpine's "x-data on a wrapping element" pattern conflicts with Shopify Theme Blocks' merchant-composable DOM — the merchant could easily move or remove the Alpine root without knowing.
2. **Hotwire / Stimulus.** Similar to Alpine in footprint. Rejected for similar reasons plus the fact that Stimulus's main differentiator — serving server-rendered Turbo Streams — isn't reachable in a Shopify theme where the server is opaque.
3. **React / Preact.** Rejected. 40+ KB of framework runtime for a theme that has maybe 30 KB of application logic is upside-down. Also forces a bundler.
4. **Svelte.** Compiles to small vanilla output — in principle the best of both worlds. Rejected because compiling requires a build step, and setting up a build step that writes into `assets/` cleanly across dev/staging/prod theme environments is a real infrastructure project that would take a day we'd rather spend on features.
5. **Write it all in Liquid.** Fine for stateless toggles where a `<details>` element is enough. Insufficient for anything with focus-trap, aria-expanded sync, localStorage, or event delegation. We use Liquid where it suffices (the `<details>` accordion pattern) and custom elements where it doesn't.

## References

- Web Components spec (WHATWG / W3C Custom Elements v1): `https://html.spec.whatwg.org/multipage/custom-elements.html`
- Shopify Horizon theme reference implementation uses a mix of vanilla and small Web Components — our approach is compatible.
- Lighthouse CI threshold rationale: see `.github/workflows/lighthouse-ci.yml` (perf 0.9, a11y 0.95 hard gates) and ADR-005 on why RUM ships to GA4 instead of Sentry Performance.
- Phase 2 bundler-based story is captured in `docs/ROADMAP.md` under the Hydrogen migration.
- Companion ADRs: ADR-001 (Theme Blocks) explains why we commit to block-composable HTML; this ADR explains the JS that enhances it.
