# ADR-007 — Playwright for end-to-end testing

**Status:** Accepted
**Date:** 2026-04-19 (Day 11 entry)
**Deciders:** Zahidul Islam (developer) on behalf of the Kindred Grove engagement

---

## Context

The project plan requires an end-to-end test suite covering five golden customer paths (homepage discovery, collection browsing with filters, product variant selection and add-to-cart, cart drawer interaction, and the build-your-pantry quiz with bulk add). The SOW lists the Playwright run as a CI blocker on the acceptance criteria checklist.

The realistic options for browser-driving an E2E suite against a Shopify storefront in 2026:

1. **Playwright** — Microsoft, multi-browser (Chromium, Firefox, WebKit), bundled trace/video/screenshot artifacts, first-class TypeScript, free OSS, official GitHub Action.
2. **Cypress** — historically the easier ergonomics, single-browser-per-spec, requires a paid Cloud plan to get parallel runs and recordings, in-browser test runtime which sometimes fights against modern site CSP headers and third-party iframes.
3. **WebdriverIO** — flexible but more configuration overhead; community has been thinning since Playwright matured.
4. **Puppeteer** — Chrome-only, lower-level than Playwright; using it for a full E2E suite would mean re-implementing a lot of what Playwright already provides.

The constraints specific to this project: tests must run against a real Shopify dev-store theme (no mocks of the storefront — the cart Ajax API, the quiz localStorage flow, and the metaobject-driven PDP only behave correctly against a live preview); they need to handle the Shopify storefront password page when the dev store is in pre-launch mode; they must produce an artifact a reviewer can play back (the case-study walkthrough video benefits from a Playwright trace); they must run inside the existing GitHub Actions pipeline with the same preflight-skip pattern as `accessibility.yml` so the inbox stays quiet when secrets are absent.

## Decision

**We use Playwright Test (`@playwright/test`) for the E2E suite, run in CI via GitHub Actions against a freshly-pushed unpublished preview theme that gets cleaned up after the run.**

Scope:

- Five golden-path specs in `tests/e2e/`: `home`, `collection`, `pdp`, `cart`, `quiz`.
- Tests run in Chromium only in CI (matches the Lighthouse CI baseline; cross-browser sweep deferred to a Phase 2 nightly run when there is a real merchant traffic baseline to defend against).
- Locally, developers can run `npx playwright test --ui` to iterate. The repo includes a `playwright.config.ts` with retries, traces on first retry, and screenshots on failure.
- The `BASE_URL` is supplied per run by the workflow — either the preview URL of the freshly-pushed theme (CI) or a developer-provided `BASE_URL` env var (local).
- Storefront password handling lives in a single `tests/e2e/_fixtures/auth.ts` helper that any spec can call before navigating; password is read from `STORE_PASSWORD` env / GitHub secret and is empty for stores that have removed the password gate.

## Consequences

### Positive

- **Multi-browser when we want it.** A single config switch turns on Firefox and WebKit. Phase 2 can add a nightly cross-browser run without rewriting tests.
- **Artifact-rich.** Each failing test ships a screenshot, the page DOM at failure, and a Playwright trace file (a self-contained HTML/JSON bundle that lets a reviewer step through the timeline). Drops straight into a GitHub Actions artifact upload, perfect for the case study.
- **Same skip ergonomics as the other workflows.** A preflight step checks `SHOPIFY_CLI_THEME_TOKEN` and `SHOPIFY_STORE`; if either is empty, the run prints an explanatory job summary and exits 0. Inbox stays quiet during the credential-mint phase.
- **Same preview-theme push pattern as `accessibility.yml`.** Already proven in CI; the cleanup step removes the unpublished preview theme on every run regardless of test outcome.
- **Free, no Cloud dep.** Playwright requires nothing beyond the OSS package; no per-run charge, no parallelism paywall.
- **Plays nicely with Percy (ADR companion).** `@percy/playwright` snapshots reuse the same browser instance, so the visual-regression workflow can ride on the same setup with one additional dependency.

### Negative

- **Browser binary install on every CI run** adds ~30s to cold starts (mitigated by the actions/cache step on `~/.cache/ms-playwright`).
- **No in-browser interactive runner like Cypress** for non-developer reviewers. A merchant cannot self-serve test runs without the CLI. Acceptable: the audience for this is the engineering reviewer, not the merchant.
- **The preview-theme push pattern means each E2E run consumes one of the merchant's theme slots momentarily.** Cleanup step mitigates, but on a hard CI failure mid-run the slot may need manual deletion. Documented in the workflow comments.

### Neutral

- We intentionally do NOT mock the Cart Ajax API or the Recommendations API. Tests run against the live preview theme so we catch the same drift a merchant would see — this matches the global rule that integration tests must hit the real surface, not a mock.

## Alternatives considered

- **Cypress** — rejected primarily because parallel runs and run recordings live behind Cypress Cloud's paid tier, and the in-browser runtime occasionally trips on Shopify's CSP and the embedded `<model-viewer>` script. Playwright runs out-of-process via the CDP and has been simpler to wire here.
- **WebdriverIO** — rejected on configuration overhead and the smaller artifact ecosystem (no native trace bundle).
- **Puppeteer + a hand-rolled test harness** — rejected because we would re-implement assertions, retries, parallelism, and reporting for no net benefit.

## Revisit triggers

- If Phase 2 adds a Hydrogen frontend, revisit whether the same Playwright suite covers both surfaces or whether the Hydrogen team prefers component-level Vitest plus a thinner E2E layer.
- If the merchant signs up to a Cypress Cloud plan independently, we can add a parallel Cypress suite for the merchant's CI dashboard while keeping Playwright as the canonical acceptance gate.
