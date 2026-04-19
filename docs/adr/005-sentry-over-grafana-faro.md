# ADR-005 — Sentry over Grafana Faro for front-end error tracking

**Status:** Accepted
**Date:** 2026-04-19 (Day 3)
**Deciders:** Zahidul Islam (developer) on behalf of the Kindred Grove engagement

---

## Context

Kindred Grove needs front-end error tracking and, eventually, a baseline of Real User Monitoring. The 25-day plan (`PROJECT_PLAN.md` §8 "Observability") calls for catching browser-side exceptions in production, tying them to a release, and being able to demonstrate "zero errors at ship" in the case study metrics.

Three realistic options for a free-tier Shopify theme in 2026:

1. **Sentry** (SaaS, `@sentry/browser` SDK, free Developer tier).
2. **Grafana Faro** (open-source front-end SDK that ships to Grafana Cloud; Grafana Cloud has a free tier).
3. **Roll-your-own** `window.onerror` + `unhandledrejection` shipping JSON to a Cloudflare Worker that writes to R2 or KV.

The theme is a Shopify theme, not a custom Node/Hydrogen app. That constrains the integration surface: we load a single JS bundle via the theme, can inject a DSN through `config/settings_schema.json`, and cannot run a server process of our own. Source maps for the theme bundle would be nice-to-have; Shopify's asset pipeline does not currently emit them for hand-authored `assets/theme.js`, so source-map upload is a Phase 2 concern regardless of vendor.

The priority ordering for this project is: (a) zero per-month cost, (b) low integration friction inside a Shopify theme, (c) a dashboard that reads well in the case study screenshots, (d) privacy posture the portfolio can defend ("we do not ship PII to a third party").

## Decision

**We use Sentry free tier for front-end error tracking, loaded via the Sentry CDN Loader Script, configured with a merchant-editable DSN in `config/settings_schema.json` and a `beforeSend` hook that strips PII.**

Scope:

- Error tracking only in Phase 1. Sentry Performance/Tracing is disabled (`tracesSampleRate: 0`).
- Real User Monitoring (Core Web Vitals) goes through the Google `web-vitals` library to GA4 custom events, *not* Sentry Performance — see the partner implementation in `assets/theme.js` on Day 3. This keeps Sentry's free-tier event budget for actual errors, not for a metric we can already get from GA4.
- DSN lives in the theme customizer (`settings.sentry_dsn`), not hard-coded, so the merchant can rotate it without a code change and so public fork-viewers don't see a live DSN.
- `beforeSend` removes `event.user.email`, `event.user.ip_address`, and trailing query strings from URLs.
- `sendDefaultPii: false` is set explicitly even though the CDN loader does not collect PII by default, because the portfolio story is "we defaulted to privacy."

## Consequences

### Positive

- **Zero cost at Phase 1 traffic levels.** Sentry Developer free tier covers 5k errors/month, which is orders of magnitude above what a portfolio dev store will see.
- **One-line load.** Loader Script is a single `<script src="js.sentry-cdn.com/KEY.min.js">` tag, lazily fetches the SDK, and only initializes if the DSN setting is populated. Theme stays fast for the default case (no DSN configured → no network call, no bundle).
- **Merchant controllable.** Sentry project, environment, and release are merchant settings. The dev/staging/production theme environments each get their own Sentry environment tag via `sentry_env`.
- **Good dashboards for the case study.** Sentry's issue view screenshots well for the Day 25 metrics deliverable (`PROJECT_PLAN.md` §12 ¶6 "Sentry dashboard showing zero errors at ship").
- **Source maps path.** Sentry has first-class source-map upload via `@sentry/cli`. When we move off hand-authored JS (Phase 2 Hydrogen migration in `docs/ROADMAP.md`), source maps work without a tool swap.
- **Release tagging.** Every Git tag (`v0.0-day3`, `v0.1-foundation`, `v1.0-release`) surfaces in the Sentry UI as a release. Regressions traceable to the introducing tag.

### Negative / accepted tradeoffs

- **Third-party script on a privacy-sensitive brand.** Kindred Grove is positioned as ethically sourced and hospitality-rooted; loading any third-party tracker deserves an active defense. We defend it by: (a) explicit PII scrubbing in `beforeSend`, (b) disabled by default (no DSN = no script), (c) documented in `docs/SECURITY.md` and the merchant guide.
- **CSP widening.** `connect-src` and `script-src` expand to include `*.sentry.io` and `*.sentry-cdn.com`. Logged in `layout/theme.liquid` CSP header comment so the next reader sees exactly why these hosts are allowed.
- **SaaS vendor lock-in.** If Sentry changes pricing or policy, we re-host. Exit cost is low: ~30 LOC of init code and a DSN.
- **No RUM in Sentry.** Our Web Vitals ship to GA4 instead. A single pane of glass would be nicer, but GA4 already exists on this store for e-commerce reporting, and doubling up would waste Sentry's free-tier budget.

### Neutral

- Developer free tier has 7-day data retention. Acceptable for a portfolio; a real merchant on this theme would upgrade to Team tier ($26/mo).

## Alternatives considered

1. **Grafana Faro + Grafana Cloud free tier** — rejected as the Day-3 pick. Faro is technically excellent (OSS, OTLP-compatible, no PII by default) but its setup surface is heavier: needs a Grafana Cloud account configured for Faro specifically, a `FaroConfig` with appName/version/instrumentations, and its free-tier log quota is tighter than Sentry's error quota for this workload. Worth re-evaluating in Phase 2 when we go Hydrogen and already have Grafana for back-end metrics — captured in `docs/ROADMAP.md`.
2. **Roll-your-own via Cloudflare Workers** — rejected. We already have enough infra; adding a bespoke error sink means writing our own deduper, grouper, and release tagger. That's rebuilding Sentry badly. Case study wants "production-grade," not "home-grown."
3. **Shopify's native Web Pixels API for errors** — rejected. Web Pixels is an analytics event API, not an error-tracking product. No stack traces, no release tagging, no issue grouping.
4. **Datadog RUM** — rejected. Enterprise-priced, no free tier that fits; would not screenshot as a credible "independent dev shipped this" signal.
5. **LogRocket** — rejected. Session replay is tempting for a case study but raises a real PII question on a store that will have (fake) customer traffic during the Day-23 Loom demo. Avoid the liability.

## References

- Sentry Loader Script docs: `https://docs.sentry.io/platforms/javascript/install/loader/` (verified 2026-04-19 via web fetch)
- Sentry data-scrubbing docs: `https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/`
- Grafana Faro GitHub: `https://github.com/grafana/faro-web-sdk` (considered, deferred)
- Plan source: `PROJECT_PLAN.md` §8 "Observability" and §13 Senior-signal additions
- Phase 2 re-evaluation trigger: Hydrogen migration, tracked in `docs/ROADMAP.md`
