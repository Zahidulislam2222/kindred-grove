# Security — Kindred Grove

Last updated: 2026-04-19 (Day 11)

This document records the security posture of the Kindred Grove theme: what's threat-modelled, what's mitigated, what's deferred, and where each control lives in the codebase.

---

## 1. Threat model (Phase 1 scope)

| Threat | Severity | Mitigation | Status |
|---|---|---|---|
| XSS via user-controlled input surfacing in Liquid | High | All user-origin strings pass through `\| escape` or `\| metafield_tag`; audit below | Mitigated |
| CSRF on cart / contact forms | Medium | Shopify-native form helpers emit `authenticity_token`; no custom POST endpoints bypass this | Mitigated |
| Bot spam on wholesale + newsletter forms | Medium | Honeypot snippet + client-side rate limit + Cloudflare Worker 16 KB payload cap | Mitigated |
| Supply-chain vulnerabilities (deps) | Medium | Dependabot on the repo; only 4 runtime-adjacent devDeps (Playwright, Percy, axe) | Mitigated |
| Admin-API token leakage via theme JS | High | No Admin API token in theme-side JS ever — Worker proxy holds the token in encrypted env | Mitigated |
| Mixed-content on the storefront | Low | CSP restricts to HTTPS; `img-src` allows `data:` + `blob:` only for model-viewer reveal poster | Mitigated |
| Third-party script injection | Medium | CSP `script-src` allow-lists only: self, Shopify CDN, Sentry CDN, ajax.googleapis.com, unpkg (model-viewer) | Mitigated |
| Sensitive data in commit history | High | `.gitignore` blocks 4 confidential docs + `.env`; history scrubbed on Day 10 via `git filter-repo` | Mitigated |
| Shopify store credential leakage (GH secrets) | High | All secrets stored in GitHub Actions Secrets (AES-encrypted at rest); no values in tracked files | Mitigated |
| Cross-site data theft via referrer | Low | `referrerpolicy="strict-origin-when-cross-origin"` on outbound links in trust-strip + footer | Mitigated |
| Wholesale form DOS | Low | CF Worker payload cap + CF rate-limit rules at the edge (default CF protection) | Mitigated |
| Authenticated admin-panel access | Out of scope | Merchant is responsible for Shopify admin 2FA; not a theme concern | N/A |
| Payment data | Out of scope | Checkout runs on Shopify's PCI-compliant infrastructure | N/A |

---

## 2. Content Security Policy

The CSP is declared via `<meta http-equiv="Content-Security-Policy">` in `layout/theme.liquid`. The exact directives evolve as vendor scripts are added; the current set is:

- `default-src 'self' https://*.shopify.com https://cdn.shopify.com`
- `script-src 'self' 'unsafe-inline' https://cdn.shopify.com https://*.shopifypreview.com https://browser.sentry-cdn.com https://*.ingest.sentry.io https://ajax.googleapis.com https://unpkg.com`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.shopify.com`
- `font-src 'self' https://fonts.gstatic.com https://cdn.shopify.com`
- `img-src 'self' data: blob: https://cdn.shopify.com https://*.shopify.com`
- `connect-src 'self' https://*.ingest.sentry.io https://*.shopify.com https://ajax.googleapis.com`
- `frame-src 'self' https://*.youtube-nocookie.com https://player.vimeo.com`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self' https://*.shopify.com`

**`'unsafe-inline'` for scripts is required** by Shopify's storefront wrapper (GA4 loader, checkout analytics, storefront password POST). Unavoidable within a Shopify theme until the platform ships nonce-based CSP.

---

## 3. Liquid output audit — escape checklist

Every user-editable string that renders as HTML passes through `escape` or equivalent. Grep-verifiable:

- **Product fields:** `{{ product.title | escape }}` — all render paths verified in `snippets/product-card.liquid`, `sections/main-product.liquid`.
- **Customer-submitted form values:** `{{ form.errors.messages[field] | escape }}`, `{{ form.email | escape }}`.
- **Merchant settings:** `{{ settings.footer_social_instagram | escape }}`, `{{ block.settings.headline | escape }}` — pattern used in every block.
- **Metaobject rich text:** `{{ farm.story | metafield_tag }}` — Shopify's Liquid applies tag-allowlist sanitization automatically for rich-text metafields. Plain strings use `| escape`.

Quick audit command (run from repo root):

```bash
# Any Liquid output that might leak raw user input
grep -rnE "\\{\\{ [a-z_.]+\\.(title|name|content|description|headline|body|email)" \
  blocks/ sections/ snippets/ layout/ --include="*.liquid" \
  | grep -v "escape\\|metafield_tag\\|strip_html\\|{% comment %}"
```

Expected output: zero lines. If any line surfaces, add `| escape` before merging.

---

## 4. Form hardening — wholesale + newsletter

### `blocks/wholesale-form.liquid`

Defense in depth (four layers):

1. **Honeypot** (`snippets/form-honeypot.liquid`) — hidden `wholesale_website` field. If submitted non-empty, both `assets/wholesale-form.js` (client-side) and `scripts/wholesale-draft-order-worker.js` (server-side) silently drop the submission.
2. **Client rate limit** — `data-min-submit-interval="8000"` attribute. Submissions faster than 8s after the previous one show a visible cooldown message. Survives tab reload via `sessionStorage`.
3. **Worker payload cap** — Cloudflare Worker rejects payloads larger than 16 KB (defense against zip bombs / oversized message abuse).
4. **Field sanitization (Worker side)** — `sanitize()` strips control characters and caps each field at 2000 chars before calling the Admin API.

Server-side, the form POSTs to Shopify's native `/contact` endpoint which applies its own spam filters + captcha escalation. The draft-order proxy (Worker) is a **separate, optional path** — the form captures the inquiry even if the Worker is down or mis-configured.

### Newsletter forms

Same honeypot snippet, no Worker proxy (submission goes to Klaviyo or the merchant's email escrow directly).

---

## 5. Admin API credentials — handling

**Where `ADMIN_API_TOKEN` lives:**

| Location | Scope | Risk |
|---|---|---|
| `.env` (local) | developer-machine only, gitignored | None — never committed |
| GitHub Actions secret | encrypted one-way at rest; decrypted only inside CI runners | None — GitHub's security model |
| Cloudflare Worker env | encrypted one-way via `wrangler secret put` | None — Worker env is encrypted |
| Theme JS / Liquid | **Forbidden** — would ship to every visitor | Mitigated: no reference anywhere |

**Scope minimization:** the custom app created at `admin/settings/apps/development → Lighthouse CI` has exactly the three scopes it needs:
- `read_themes` + `write_themes` — for the Shopify Lighthouse CI action to create/delete the ephemeral audit theme
- `read_products` — for Lighthouse's auto-detection of a product handle to audit
- (Optionally `write_customers` if the Worker is extended to tag inquirers as wholesale leads — not enabled by default)

No `write_orders`, no `write_customers` on the default install. Adding a new Admin-API consumer means auditing the scope diff before granting.

---

## 6. Dependency hygiene

- **Dependabot** config at `.github/dependabot.yml` (created Day 11) scans: `npm` (root `package.json`), `github-actions` (all workflow versions), weekly.
- **Lockfile integrity** — `package-lock.json` is committed; `npm ci` used in CI (not `npm install`) so transitive-dep changes require an intentional lockfile update.
- **Runtime deps (theme side):** zero. The theme ships unbundled. `npm install` only pulls devDeps for the test suite.

---

## 7. Secrets-in-repo guard

- `.gitignore` blocks: `.env`, `docs/SOW.md`, `docs/BRAND-BRIEF.md`, `docs/BUILD-LOG.md`, `docs/CI-SECRETS.md`, `PROJECT_PLAN.md`, `shopify_dev_requirements_checklist.html`, `node_modules/`, `test-results/`, `playwright-report/`, `.shopify/`.
- `.env.example` is the public template — all values blank.
- Historical scrub: on Day 10, the 4 confidential docs plus the Cloudflare Account ID were purged from the entire git history via `git filter-repo`. All 10 day-tags were re-pushed to point at rewritten commits.
- **Gitleaks CI check** (`.github/workflows/gitleaks.yml`) — runs on every PR, every push to `main`, plus a weekly scheduled deep-scan every Monday 06:00 UTC. Config at `.gitleaks.toml` inherits the default rule set (AWS keys, Shopify tokens, GitHub PATs, Sentry DSNs, Slack webhooks, and ~140 more) and adds a tight allowlist for known placeholder strings (`shpat_xxx`, `web_…`, `G-XXXXXXXXXX`, etc.) so the handful of legitimate example values in `docs/`, `scripts/`, and `.env.example` don't trip the scanner.
- **Manual audit:** no `shpat_`/`shpss_`/`shptka_` strings anywhere in tracked files except the documented placeholders.

---

## 8. CI workflow trust boundaries

| Workflow | Has access to | Can affect |
|---|---|---|
| `theme-check.yml` | source-only | Local repo (no secrets used) |
| `lighthouse-ci.yml` | `SHOPIFY_CLIENT_ID/SECRET`, `SHOPIFY_STORE_PASSWORD`, `LHCI_GITHUB_APP_TOKEN` | Creates + deletes ephemeral development themes on the dev store |
| `accessibility.yml` + `e2e.yml` + `visual-regression.yml` | `SHOPIFY_CLI_THEME_TOKEN`, `SHOPIFY_STORE_PASSWORD`, `PERCY_TOKEN` | Creates + deletes unpublished themes via `shopify theme push` |
| `deploy-dev.yml` / `deploy-staging.yml` | `SHOPIFY_CLI_THEME_TOKEN`, `SHOPIFY_THEME_ID_DEV` / `_STAGING` | Overwrites dev or staging theme file contents |
| `deploy-production.yml` | same as staging, plus gated by `production` environment required-reviewer | Overwrites the live theme — **only with human approval** |

The `production` environment has a required-reviewer rule (Zahidul Islam); no merge to main auto-deploys without an explicit approval click.

---

## 9. Observability — what we capture, what we never capture

**Sentry frontend errors** (`layout/theme.liquid` → `beforeSend` hook):
- Stripped: all `extra` properties, all `tags` that match `email`, `phone`, `customer`, `address`.
- Kept: stack trace, exception type, URL path, user-agent, release tag.
- PII posture: zero-PII by default. Merchant opts in to user-scoped context only after a documented DPA review.

**GA4 enhanced-ecommerce**:
- Kept: product SKU, price, currency, step in cart funnel.
- Never sent: email, phone, shipping address, payment-method details.

---

## 10. Disclosure path

Found a vulnerability? Email `security@<project-domain>` (set by the merchant). This repo is public, but the merchant's private `docs/SECURITY-RUNBOOK.md` (not in repo) has the escalation contacts and SLAs.

---

## Deferred items (Phase 2 / Week 4 pre-ship)

- Subresource Integrity on external script tags (planned Phase 2 with Hydrogen migration)
- Nonce-based CSP — replaces `'unsafe-inline'` for scripts once Shopify Liquid exposes a nonce primitive
- Penetration test of the wholesale Worker before production deployment
- Pre-commit `gitleaks` hook (CI scan is active; local pre-commit is nice-to-have)
