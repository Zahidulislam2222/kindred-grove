# Contributing — Kindred Grove

This theme is maintained by Anderson Collaborative for Kindred Grove. The guidelines below keep the repo shippable at every commit.

---

## 1. Dev setup

Prerequisites: Node 22+, Shopify CLI 3.93+, Git.

```bash
git clone https://github.com/Zahidulislam2222/kindred-grove.git
cd kindred-grove
npm install
npx playwright install chromium
cp .env.example .env             # fill in SHOPIFY_STORE_URL + SHOPIFY_THEME_ID_DEV at minimum
shopify theme dev --theme $SHOPIFY_THEME_ID_DEV --store $SHOPIFY_STORE_URL
```

See [`docs/CI-SECRETS.md`](docs/CI-SECRETS.md) for how to mint each credential (Theme Access token, Admin API token, Percy, Klaviyo public key, Sentry DSN).

---

## 2. Branch + commit flow

- `main` is protected. All changes land through pull requests.
- Branch naming: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `chore/<scope>`, `ci/<scope>`.
- Conventional commits: `type(scope): short description` (e.g. `feat(cart): gift-note block`). No body is fine for one-line changes; multi-line body preferred for cross-cutting work.
- Every commit includes the `Co-Authored-By: Claude Opus 4.7 …` trailer when AI tooling was used. See [`docs/AI_GOVERNANCE.md`](docs/AI_GOVERNANCE.md) for when to include it.

---

## 3. Before opening a PR

Run the full local check:

```bash
shopify theme check               # Liquid lint — must be 0 offenses
npm run test:a11y                 # axe WCAG 2.1 AA — must be 0 violations
npm run test:e2e                  # Playwright golden paths
```

For pure-docs or pure-workflow changes, `shopify theme check` is enough. CI will run the full suite against the merged state.

---

## 4. PR expectations

- **Title** — conventional-commit style. Under 70 chars.
- **Body** — what changed, why, and a brief test plan. If the change is UI-facing, include before/after Percy IDs.
- **One logical change per PR.** Refactor + feature + doc in three separate PRs is better than one 30-file mega-diff.
- CI must be green before review. If CI is red for infrastructure reasons (e.g. dev-store password timing), note it in the PR description and link the Shopify issue.

---

## 5. Code conventions

### Liquid

- BEM-style class naming: `.kg-hero`, `.kg-hero__media`, `.kg-hero--text-light`.
- Every merchant-facing string goes through `{{ '...' | t }}` → `locales/en.default.json`. Mirror new keys in `locales/ar.json`.
- Every user-controlled string escaped: `{{ value | escape }}` or `| metafield_tag` (for rich-text metafields). The pattern audit in [`docs/SECURITY.md §3`](docs/SECURITY.md) is grep-enforceable.
- No `margin-left` / `padding-right` — use logical properties (`margin-inline-start`, `padding-inline-end`). RTL support depends on this.
- Every block's schema must have `label` and (where non-obvious) `info` per setting, plus a sensible `default`. Merchants read these; don't make them guess.

### JavaScript

- Web Components only. Tag prefix `kg-`. `connectedCallback` registers listeners; `disconnectedCallback` cleans up.
- No framework imports. If you think something needs React, open an ADR first.
- Fetch errors → `if (window.Sentry) window.Sentry.captureException(err);` plus a user-facing fallback. Never a silent failure.
- All Shopify API calls go through fetch (`/cart/add.js`, `/cart.js`, `/search/suggest.json`, `/cart/update.js`). No jQuery-era shim code.

### CSS

- Token-first. Every color / radius / spacing / font-size / motion value is a CSS custom property defined in `assets/theme.css`. Hardcoded hex values only appear as accessibility fallbacks (the double-declaration pattern — see [`docs/ACCESSIBILITY.md §2`](docs/ACCESSIBILITY.md)).
- Accessibility baseline: new small-text primary surfaces use the deeper olive (`#576839` / `--color-primary-hover`). Keep contrast ≥ 4.5:1 on any text.
- `prefers-reduced-motion` respected globally in `theme.css:285`. Any new animation must honor it or have a code-review explanation.

### Tests

- New customer-journey → Playwright spec in `tests/e2e/`. Use `unlockStorefront()` in `beforeEach`.
- New visual surface → Percy snapshot in `tests/visual/snapshots.spec.ts` at all 4 widths.
- New accessible surface → the 4-route axe scan auto-covers it if the route already exists. Add the route if new.

---

## 6. Adding a new block

1. Create `blocks/<name>.liquid` with the `{% schema %}` tail.
2. Schema must have: `name`, `settings[]` (each with `label` + `info` + `default`), `presets[]` with at least one entry.
3. Reference in a host section via `{ "type": "@theme" }` — or list explicitly under `blocks[]` if it should only appear in specific sections.
4. Style in `assets/components.css` with `.kg-<name>__*` class prefix.
5. If it needs JS, add `assets/<name>.js` (web component) and include in `layout/theme.liquid` with `defer`.
6. Translate any user-facing strings via locales.
7. theme-check should remain 0 offenses.

---

## 7. Adding a new test

Matching the style in place:

- `tests/e2e/` — one golden path per spec file, semantic selectors, shared fixtures.
- `tests/a11y/axe.spec.ts` — append to the `routes` array.
- `tests/visual/snapshots.spec.ts` — add a `test('...', …)` block; name the snapshot something stable (not date-stamped).

See [`docs/TESTING.md`](docs/TESTING.md) for the debug playbook when CI goes red.

---

## 8. AI-assisted changes

This project uses AI (Claude Code, Claude Design, Shopify Dev MCP) heavily. The policy is in [`docs/AI_GOVERNANCE.md`](docs/AI_GOVERNANCE.md):

- AI-assisted commits end with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- Human reviewer reads every diff before it merges. No auto-merge on AI output.
- Prompts used for a non-trivial change (new block, new workflow, new ADR) are logged to `docs/AI-WORKFLOW.md` so the methodology is reproducible.

---

## 9. Release

- `main` auto-deploys to production on merge — gated by the `production` GitHub environment (required reviewer = Zahidul Islam).
- `staging` branch auto-deploys to the staging theme.
- `dev/**` branches auto-deploy to the dev theme.
- Day-tagged versions (`v0.0-day1` … `v0.0-day21+`) for the build sprint. Semantic versions (`v1.0.0`+) kick in at Phase 1 handover.

---

## 10. Where to ask

- Bug in the theme: open a GitHub issue with steps-to-reproduce.
- Security issue: see [`docs/SECURITY.md §10`](docs/SECURITY.md) for the disclosure path.
- Architecture question: check `docs/ARCHITECTURE.md` + the 8 ADRs first, then open a discussion.
- Merchant / content question: `docs/MERCHANT-GUIDE.md` first, then the merchant's Shopify Partner rep.

Thanks for contributing.
