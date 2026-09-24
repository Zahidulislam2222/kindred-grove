# Configuration boundaries

Updated 2026-09-24. Phase 2 is accepted on the development theme. This map describes the reviewed configuration owners and their deployment/browser evidence.

## Owners

| Runtime or value | Authoritative owner | Consumers and rule |
|---|---|---|
| Merchant choices, demo mode, products and section copy | Shopify settings/schema and section/block settings | Liquid templates; no environment-variable copy of catalog or business content |
| Translated interface text | `locales/en.default.json`, `locales/ar.json` | Liquid and escaped browser configuration |
| Optional component transport, UI timing and display limits | `snippets/client-config.liquid` | `assets/client-runtime.js` validates the payload; search, recommendations, quick view and recently viewed consume it |
| Cart routes, artwork and messages | `snippets/client-config.liquid` | Shared cart coordinator and shopping components; Shopify supplies native route and asset URLs |
| Grove display and motion policy | `snippets/grove-config.liquid` | Header/video and Grove components; escaped configuration preserves merchant settings |
| Quiz limits and maintained questions/personas | `snippets/quiz-config.liquid`, block settings and locales | Quiz validates data and keeps answers in component memory |
| Consent API loading, owned storage keys and retention | `snippets/privacy-config.liquid` | Privacy adapter, feature flags, recently viewed and quiz; native Shopify consent remains authoritative |
| Optional 3D feature name/version/timeout and copy | `snippets/model-viewer-config.liquid`, block settings | Native Shopify media adapter; inert model template, explicit activation, poster fallback |
| Browser test inputs | `scripts/config/test-config.cjs` | Validates environment inputs for Playwright and password fixtures |
| Browser test timeouts/retries/workers | `scripts/config/test-defaults.json` | No duplicated defaults in runner/fixtures |
| Tool versions and Gitleaks archive checksum | `scripts/config/toolchain.json` | CI toolchain helper; action revisions remain pinned at their workflow use sites |
| Capacity assumptions and loopback harness limits | `scripts/capacity/scenarios.json` | Model and local-only synthetic harness; no external target support |
| Preserved legacy catalog | `scripts/data/legacy-demo-products.json` | Offline validator only; source content is unverified and is not an active seed catalog |
| CI credentials and target IDs | GitHub secrets/environment inputs | Workflow preflight and target validation; never values in source |

Shopify supplies locale-aware route data, prices, currency and product records. Predictive-search decimal prices are major currency units; product/cart prices use Shopify minor-unit representation. The component-specific formatter contracts are covered by regression fixtures. Use its [routes object](https://shopify.dev/docs/api/liquid/objects/routes) and [Ajax API guidance](https://shopify.dev/docs/api/ajax), rather than constructing an environment-specific host in application code.

## Environment inputs

`.env.example` lists safe names and blank values. It does not establish that local or remote credentials exist. Node does not implicitly load `.env`; use an explicit environment loader for local commands.

| Name | Purpose and validation |
|---|---|
| `SHOPIFY_STORE_URL` | Local CLI documentation input; explicitly pass the intended store to Shopify CLI |
| `SHOPIFY_STORE` | Canonical `*.myshopify.com` host for CI/preview validation; optional for an independently configured custom-domain local preview |
| `SHOPIFY_THEME_ID_DEV`, `SHOPIFY_THEME_ID_STAGING`, `SHOPIFY_THEME_ID_PRODUCTION` | Deployment target identifiers; names alone never establish the current native theme role |
| `SHOPIFY_CLI_THEME_TOKEN` | Theme Access credential supplied through the process environment, never command arguments |
| `BASE_URL` | Required test target; HTTPS, except loopback HTTP; URL credentials and credential-like query parameters rejected |
| `PREVIEW_URL` | Optional numeric `preview_theme_id`; when `SHOPIFY_STORE` is supplied the preview host must match it; otherwise it must share `BASE_URL` origin |
| `SHOPIFY_STORE_PASSWORD`, legacy `STORE_PASSWORD` | Optional until a password page is encountered; conflicting aliases rejected; current page, form and submitter must use the trusted origin and effective POST before password entry |
| `TEST_COUNTRY` | Optional two-letter country; commerce fixtures select it through Shopify localization and assert the rendered selection; it must be an enabled market |
| `CI` | Runner context, accepts `true`/`1` and `false`/`0`; absent means local; no secret |
| `GITLEAKS_BIN` | Optional scanner executable path used by scanner regression tests; otherwise resolved from `PATH` |
| `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | Optional manual Lighthouse integration credentials; not an application runtime dependency |
| `PERCY_TOKEN` | Legacy optional external visual workflow; not required for local screenshots; entitlement and cost must be checked before invocation |
| `LHCI_GITHUB_APP_TOKEN` | Optional Lighthouse report integration; not needed for offline security tests |

GitHub-generated runner variables and temporary paths are supplied by the runner, not copied into application configuration. CLI login material remains managed by the installed CLI and the private recovery record. No Admin API token is needed by the retired seed validator or Worker stub.

## Browser boundary and failure policy

Configuration is serialized into escaped, non-executable template attributes and parsed defensively. The shared client rejects invalid configuration, unapproved navigation/image URLs, URL credentials and credential-like query parameters. Request timeouts cover the response body; configured byte caps bound parsed responses. Requests use same-origin credentials and reject redirects. Product/catalog content still requires contextual escaping at its final DOM sink.

Optional reads abort when superseded or disconnected. Writes are never automatically retried: a transport failure can occur after Shopify has accepted a mutation. Cart integration must reconcile the current cart and explain an uncertain result before allowing another attempt. The combined development browser gate passed, including native cart 0→1→2→0; failure and hostile-input regressions remain part of the local suite.

The theme's custom telemetry loaders are removed. This does not disable Shopify, installed app or hosted-account collection. Privacy policy and storage behavior are documented in [PRIVACY.md](PRIVACY.md).

## Retired and optional paths

The old Admin REST catalog writer is now an offline validator. Its default command reads local reference JSON only; `--apply` exits nonzero without a catalog mutation. The legacy Worker returns HTTP 410 and has no active bindings or outbound requests. Neither should receive new credentials.

Unused future GA, Sentry, Klaviyo, review-app, headless and Cloudflare variables were removed from the active environment template. The optional 3D block now uses Shopify native media and feature APIs. It retains an inert template until activation, a static poster/failure message, and a configured loading deadline. Focused lifecycle tests and independent source review passed; no live 3D catalog or device/AR capability is claimed. Percy remains an optional, uninvoked historical integration; local Playwright screenshots are the free baseline.

## Audit status

- Combined local security/configuration gate: 95/95 tests. Actual development browser gate: 41 passed, 0 failed, 5 documented skips; alternate Quiz/Wholesale flows 2/2 and active axe 2/2.
- Seed/demo source review accepted the fixed offline path and demo guards; root reran seed 5/5, including default and blocked apply.
- Toolchain pins and action-tag mappings were checked against official release sources earlier in this task; hosted security/configuration and Liquid checks passed for PR8/source078aae7; see TESTING.md for run links.
- Independent cart/config, quiz/privacy and model source reviews passed after corrections. Public-source Gitleaks and Semgrep returned zero findings; the combined development theme has exact 150-file local/downloaded parity. Actual Phase 2 storefront acceptance passed within the documented route/platform scope.
- Standalone JS/CSS lint, type-check and bundler-build scripts are absent. Report those gaps explicitly; native Liquid uses Shopify rendering and Theme Check.
- Stable protocol syntax, schema.org vocabulary, HTML attributes, HTTP semantics and repository-relative package data locations are retained as named protocol/structure definitions. Changeable provider versions, timeout policy, content and deployment targets do not belong in feature control flow.

See [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md) and [BUILD-PLAN.md](../BUILD-PLAN.md) for the remaining gates. The accepted audit covers inspected source/configuration and tested theme behavior; future changes and platform integration require renewed review.
