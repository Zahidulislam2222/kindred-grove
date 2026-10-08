# ADR-007 — Playwright for real storefront verification

**Status:** Accepted; current workflow clarified 2026-10-08. Original decision dated 2026-04-19.

## Decision and rationale

Use Playwright Test for real Shopify storefront flows and axe accessibility checks. A test must reach the intended store/theme, identify actual page content and exercise observed behavior. Use isolated visitor contexts and configured password authentication without recording credentials or full session payloads.

The suite covers homepage/header/media behavior, collections/products, native cart, search, quiz, consent and accessible navigation. Current quiz answers stay in page memory and reset after reload; they are not a local-storage journey. Cart integration reaches native Shopify endpoints rather than substituting a simulated API.

## Current operation

The shared validated test configuration owns target URLs, optional preview URL, password aliases, country and runner defaults. Missing credentials in manual credentialed workflows fail preflight. CLI preview output is independently checked against the configured target before password entry. Hosted offline source/security checks are separate from browser workflows.

Credentialed workflows can create an unpublished preview theme only when explicitly run with approved inputs; cleanup is best-effort, so inspect any remaining theme after a failure. No hosted browser execution is claimed by the presence of YAML. Chromium is the current exercised browser; other engines need separate verified results.

## Acceptance evidence and limits

The October authenticated published-store suite passed 55 browser cases plus a separate native search/mobile axe check. Three conditional catalog/article checks skipped with evidence. Seven canonical content pages now exist. No message, personal data, order or payment was submitted. Source tests, Theme Check, scans, independent review and exact deployment parity remain separate evidence.

Storefront-password authentication establishes browsing behind the gate; it does not establish anonymous storefront access. A fresh-context public-entry check must inspect the gate independently. Screenshots, traces and reports belong in ignored artifact folders and must be scrubbed before sharing.

## Historical context

Earlier plans referred to local-storage quiz persistence and successful CI skips when secrets were missing. Those descriptions are superseded by memory-only answers and fail-closed preflight. Percy or another external visual service is optional and requires current entitlement/cost verification before activation.

[Testing](../TESTING.md), [accessibility](../ACCESSIBILITY.md), [access](../STOREFRONT-ACCESS.md), [Playwright documentation](https://playwright.dev/docs/intro).
