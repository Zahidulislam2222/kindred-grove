# ADR-008 — Consent-gated optional feature assignments

**Status:** Current behavior clarified, 2026-10-08. Original local-storage decision dated 2026-04-19; privacy hardening dated 2026-09-24.

## Decision and rationale

Keep optional feature assignments within the shared consent boundary. Persistent visitor assignment needs both explicit analytics consent and Shopify's corresponding processing permission. GPC/DNT deny the theme's analytics/marketing/sharing purposes; denial or withdrawal removes narrowly owned visitor/assignment/override keys when storage is available. Blocked storage or unavailable permission fails closed.

The canonical pantry quiz is no longer experiment-gated. Its answers remain in current-page component memory, do not become visitor assignment data, and reset on reload. Removing a quiz experiment cannot be substituted with a persisted off assignment.

## Verification and boundaries

Meaningful source/configuration tests and real browser consent/quiz checks cover the authored feature behavior. Signal emulation is not universal browser conformance. Theme logic does not govern Shopify/app pixels, platform collection, checkout/accounts or merchant data retention. Optional Sentry/Web Vitals loaders and theme telemetry callbacks are removed.

## Future changes

Before introducing an experiment, approve the content variants, purpose, data fields, consent/retention, measurement method and operating owner. Maintain definitions in validated settings/data rather than hardcoded control flow. Do not claim statistically valid outcomes without an agreed method and observed data. No external experimentation service or paid integration is activated by this ADR.

[Privacy](../PRIVACY.md), [configuration](../CONFIGURATION.md), [testing](../TESTING.md), [Shopify Customer Privacy API](https://shopify.dev/docs/api/customer-privacy).
