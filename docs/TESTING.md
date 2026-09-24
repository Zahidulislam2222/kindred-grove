# Testing and CI boundaries — Kindred Grove

Last updated: 2026-09-24

## Required local regression checks

The theme itself is unbundled. The Node package files provide a test harness;
install its exact dependency tree with the committed lockfile:

```sh
npm ci --no-audit --no-fund
node --test tests/security/*.test.cjs
shopify theme check --fail-level=error
```

The security suite uses Node's built-in test runner. The Gitleaks configuration
regression test also requires Gitleaks 8.30.1 on `PATH` or `GITLEAKS_BIN` set to
that executable. CI downloads the official Linux x64 archive, verifies its
published SHA-256 recorded in `scripts/config/toolchain.json`, and scans it
before running tests. CI also runs the pinned Semgrep Community Edition
`p/security-audit` rules over `assets/` and `scripts/` with metrics disabled.
This local CE scan is a useful static check but is not the paid Semgrep platform
or a substitute for review. Bandit is not applicable: no Python shipping source
is included in this scan scope, so it is not reported as a passing gate. The
toolchain manifest owns the Node.js, Shopify CLI, Semgrep, and Gitleaks versions.

The CI workflow runs only local regression tests with read-only repository
access on GitHub-hosted runners. It makes no Shopify, Percy, Lighthouse, or other
storefront/API request. Theme Check also runs on PRs and pushes to `main` and
`staging` using the pinned Shopify CLI.

## Storefront test harness

E2E and axe accessibility workflows are manual-only because they create a
temporary Shopify preview theme and require Shopify access credentials. They
fail during preflight when required credentials are absent; they do not report
a successful skip. When run with valid configuration, they push an unpublished
theme, test it, and attempt cleanup. Cleanup is best-effort, so a failed run can
leave a temporary unpublished theme to inspect and remove through Shopify.

The local harness expects `BASE_URL` to be HTTPS (or localhost HTTP), with an
optional same-origin `PREVIEW_URL`. A storefront password, if needed, is passed
as `SHOPIFY_STORE_PASSWORD`. Example target values below are placeholders and
must be replaced with the intended test storefront and preview URL:

```sh
BASE_URL="https://shop.example.test" \
PREVIEW_URL="https://shop.example.test/?preview_theme_id=123" \
npm run test:e2e

# For both suites, configure .env explicitly and load it for each invocation:
node --env-file=.env node_modules/@playwright/test/cli.js test tests/a11y --project=chromium
```

The browser tests do not place orders or submit the wholesale inquiry form.
A cart mutation that does not persist must fail with observed HTTP/UI evidence;
do not turn it into a skip by guessing that bot protection caused it. The final Phase 2 development run passed 41 cases, with zero failures, five
documented skips and no flaky results.
Missing credentials also fail workflow preflight.

## Optional external integrations

Visual regression through Percy and the Shopify Lighthouse audit are manual
workflows. They are absent from the required offline PR checks. Percy requires
an account token and applicable plan entitlement; do not assume it is free.
Lighthouse requires Shopify Dev Dashboard credentials and contacts Shopify's
service. Verify the relevant account terms before manually invoking either
workflow. Missing required credentials fail before the external service call.

## Deploy workflow status

The dev, staging, and production workflow files are manual verification gates,
not functioning deploy pipelines. Each runs local regression/theme checks where
configured and then fails closed because no automated remote-drift comparison
and post-deploy parity proof has been implemented. Production has no `push` or
`publish` command: production writes are disabled. It accepts only an explicit
`production-live` target input.
Do not interpret a manual trigger as deployment authorization or a successful
release.

Before any write workflow is enabled, implement and independently review a
release routine that verifies the exact remote target and baseline, blocks when
remote code is ahead or drift is unexplained, applies reviewed local artifacts,
and proves local/remote parity afterward. A missing baseline or verification
must stop the write.

## GitHub configuration state

`.github/branch-protection.json` is a sample only; its wrapper fields
`sample_only` and `not_applied_to_remote` intentionally make it unsuitable as a
direct GitHub API request. It recommends the CI security/config, Theme Check,
and Gitleaks statuses after they have been enabled and observed.
These statuses are not yet verified as enabled or required remotely.

The latest native repository inventory available for this task reported that
`main` had no required status checks and the Gitleaks workflow was disabled by
inactivity. Workflow source triggers do not prove a remote workflow is enabled,
required, or passing. No GitHub workflow run was performed and no GitHub settings were changed as
part of this local update; root review and a fresh native inventory are still
needed before claiming remote CI readiness.

## Phase 2 acceptance evidence — 2026-09-24

- Criteria 6/6 met for the reviewed development artifact; independent scoped review accepted.
- Security/configuration: 95/95. Browser E2E plus four base axe routes: 41 passed, 0 failed, 5 skipped, 0 flaky. Separate alternate Quiz/Wholesale functional checks 2/2 and active axe checks 2/2, zero violations.
- Theme Check: 0 errors, 2 existing orphan-snippet warnings. JavaScript syntax, Gitleaks, Semgrep and installed edit-hook checks passed in their recorded scopes. Standalone type-check, JS/CSS lint and bundler-build scripts are absent; Bandit is inapplicable to shipping JS/CSS/Liquid.
- Exact SHA-256 parity across all 150 local, frozen and downloaded development files. No live publication.
- Real flows: cart 0→1→2→0, native consent choices/withdrawal/reload, explicit GPC/DNT emulation, header/video/copy, keyboard/focus, reduced motion, no-JS navigation at 320/390 px, product reflow at 320/370/371/390/1440 px, and five-question Quiz/result collection/reload without answer persistence.

Skips remain explicit: single-variant catalog, canonical Quiz and Wholesale pages returning 404, no article and Shopify-hosted account redirect. Alternate-template checks do not create merchant resources; Quiz used a feature override after native Accept. No screen-reader, complete browser zoom, legal compliance, platform capacity or continuous uptime claim follows from these results. Hosted CI execution/enforcement remains unverified. Work stopped after Phase 2 at the user's request.
