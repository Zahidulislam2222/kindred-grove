# Contributing

This repository contains an unpublished Shopify theme redesign and its test tooling. Read [BUILD-PLAN.md](BUILD-PLAN.md) for the active milestone and [ARCHITECTURE.md](docs/ARCHITECTURE.md) for service boundaries. Do not infer deployment status from a branch or theme name.

## Setup

Use the versions in `scripts/config/toolchain.json`, install Git, then install the locked test dependencies:

```sh
npm ci --no-audit --no-fund
npx playwright install chromium
cp .env.example .env
```

Fill only the inputs needed for the intended task. Load environment variables explicitly; `.env` is not automatically loaded by every CLI. See [CONFIGURATION.md](docs/CONFIGURATION.md) and [TESTING.md](docs/TESTING.md). Never put credential values into source, command arguments, screenshots or public logs.

Before a Shopify write, obtain the native theme inventory and a remote snapshot, identify the exact target and compare it with the known baseline. Reconcile unexplained remote changes locally before editing or uploading. A development watcher uploads edits automatically; use it only when that behavior is intended. Integration review uses a frozen artifact, followed by a fresh drift check, upload and pulled hash comparison.

## Change and review workflow

1. Write concrete acceptance criteria before nontrivial implementation.
2. Keep a feature/fix scoped to a reviewable branch. Preserve unrelated local work.
3. Implement the smallest change, using existing configuration and native platform boundaries.
4. Run relevant tests, Theme Check, secret scanning, static analysis and the actual CLI/HTTP/browser flow. Report missing gates and skipped tests separately from passes.
5. Obtain an independent review against the criteria. Record any escaped defect and the gate added to catch it.
6. Deploy only the reviewed artifact after target/drift validation; prove pulled parity afterward.

Use a concise PR title and description explaining the resulting behavior, evidence and remaining limitations. Screenshots from local Playwright are sufficient for visual review; no paid integration is required. Conventional commit names are useful, but do not invent an AI model attribution or imply a human reviewed a change when they did not.

## Local gates

```sh
node --test tests/security/*.test.cjs
shopify theme check --fail-level=error
node --env-file=.env node_modules/@playwright/test/cli.js test tests/e2e --project=chromium
node --env-file=.env node_modules/@playwright/test/cli.js test tests/a11y --project=chromium
```

The browser commands require the explicitly configured target and, where applicable, password. Scanner tests require the pinned Gitleaks binary on `PATH` or via `GITLEAKS_BIN`. Tests must not submit real personal information, place orders or invoke paid services.

The unbundled theme has no standalone JS/CSS lint, type-check or bundler-build scripts. Theme Check validates Liquid; it does not replace browser behavior or security review. Current warnings and actual results belong in the change report. Documentation-only changes need link/content/secret verification, not an invented runtime test result. Workflow changes need workflow-specific validation and must not be called hosted CI passes until run remotely.

## Code conventions

- Keep merchant content in Shopify settings and interface messages in locale JSON. Add corresponding locale keys together.
- Escape each value for its actual HTML, attribute, URL or JavaScript context. Serialize browser data into escaped non-executable templates and validate it before use.
- Use the shared bounded client transport for additive Shopify requests. Pass locale-aware route data from Shopify. Never retry a cart mutation automatically after an uncertain outcome.
- Web Components must clean up listeners, observers and nonessential reads on disconnection and tolerate reconnection.
- Show safe localized failures. Do not send customer payloads or raw errors to a telemetry SDK. Optional collection requires the explicit privacy boundary and applicable consent.
- Preserve demo guards, native fallbacks, keyboard access, reduced motion and direction-aware CSS. Color/spacing/motion decisions belong in the existing token/settings layer.
- Add genuine CI regression tests under the existing `tests/` conventions. Personal diagnostic scripts remain in a separate ignored project folder. Improve existing test tools in place; do not delete them during cleanup.

## Release and hosted CI status

Local release workflow files currently fail closed before writes while reusable drift/parity automation is unfinished. The old default-branch production workflow still permits automatic live writes until the replacement is reviewed and merged; do not run it. The latest repository inspection found no required `main` status contexts and an inactive Gitleaks workflow; the checked-in branch-protection file is a sample, not evidence of enforcement.

On 2026-09-24, [PR #8](https://github.com/Zahidulislam2222/kindred-grove/pull/8) at source commit `078aae7` passed hosted [Security and config regression](https://github.com/Zahidulislam2222/kindred-grove/actions/runs/35937547220) and [Liquid linting](https://github.com/Zahidulislam2222/kindred-grove/actions/runs/35937547177). Main still requires one approving review; no status contexts are configured as required. Gitleaks remains disabled by inactivity remotely, with source/history/staged scans performed locally. No hosted browser or deployment run was invoked.

Follow [TESTING.md](docs/TESTING.md) and [OPERATIONS.md](docs/OPERATIONS.md). Remote protection, reviewer requirements and workflow execution must be verified before claiming they are active. Optional Percy/Lighthouse integrations remain outside the required offline gate and must not be enabled without checking entitlement and cost.
