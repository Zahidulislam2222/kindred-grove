# Architecture — Kindred Grove

> How the theme is organized, why, and where each responsibility lives. Read this before editing.

---

## Tech stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Theme pattern | Theme Blocks (8-level nested) | See `docs/adr/001-theme-blocks-over-legacy-sections.md` |
| Template language | Liquid | Shopify native |
| Front-end | Vanilla JS + Web Components | No framework churn, durable |
| Styling | Modern CSS (custom properties, logical properties) | RTL handled without duplicate sheets |
| Data | Metaobjects + typed metafields | Merchant edits in admin, not code |
| APIs | GraphQL Storefront + REST Admin | Storefront for reads, Admin for writes |
| Deployment | Shopify CLI via GitHub Actions | 3 theme envs, auto on branch push |
| AI tooling | Shopify Dev MCP + Claude Code | Direct doc/schema access, not guessing |

---

## Folder structure

```
kindred-grove/
├── .github/
│   ├── workflows/         ← CI (theme-check, lighthouse, e2e, accessibility, visual, 3x deploy)
│   └── branch-protection.json
├── .mcp.json              ← Shopify Dev MCP config (project-scoped)
├── assets/                ← CSS, JS, images, fonts references
│   ├── theme.css          ← tokens only (CSS custom properties)
│   ├── base.css           ← element defaults, extended reset
│   ├── utilities.css      ← spacing, layout, typography, display utilities
│   ├── components.css     ← button, badge, input, card
│   └── theme.js           ← entry point (Web Components register here)
├── blocks/                ← Theme Block primitives (LEGO pieces)
│   ├── text.liquid
│   ├── button.liquid
│   ├── image.liquid
│   └── spacer.liquid
├── config/
│   ├── settings_schema.json   ← merchant customizer groups
│   └── settings_data.json     ← current setting values
├── docs/
│   ├── adr/               ← Architecture Decision Records (Context/Decision/Consequences)
│   ├── design-system/     ← design token doc + case study artifacts
│   ├── ARCHITECTURE.md    ← this file
│   ├── BRAND-BRIEF.md
│   ├── BUILD-LOG.md       ← resumable checkpoint file (read first when resuming)
│   ├── SOW.md
│   └── AI-WORKFLOW.md
├── layout/
│   └── theme.liquid       ← base HTML shell, head, landmarks, token injection
├── locales/
│   ├── en.default.json    ← all user-facing strings extracted here
│   └── ar.json            ← Arabic translations (Day 17)
├── sections/              ← static composition targets (merchant cannot add/remove)
│   ├── header.liquid
│   └── footer.liquid
├── snippets/              ← reusable Liquid partials (non-block)
│   ├── button.liquid
│   ├── icon.liquid
│   ├── image.liquid
│   └── form-field.liquid
├── templates/             ← page-type entry points
│   ├── index.liquid       ← homepage
│   ├── product.liquid     ← PDP (Day 7)
│   ├── collection.liquid  ← PLP (Day 6)
│   ├── page.liquid
│   ├── 404.liquid
│   ├── gift_card.liquid
│   ├── robots.txt.liquid
│   └── search.liquid
├── tests/
│   ├── e2e/               ← Playwright specs (Day 14)
│   └── a11y/              ← axe-core custom specs
├── .editorconfig
├── .env.example
├── .gitignore
└── README.md
```

---

## Theme Blocks layering

```
layout/theme.liquid
  ↳ sections/header.liquid   (static, contains blocks)
  ↳ {{ content_for_layout }} (template slot)
  ↳ sections/footer.liquid   (static, contains blocks)

templates/*.liquid
  ↳ main section(s) with block regions
      ↳ blocks/text, blocks/button, blocks/image, blocks/spacer
          ↳ nested blocks up to 8 levels
```

Key rule: **sections are static composition targets; blocks are reusable primitives**. A merchant cannot add or remove sections from the theme editor in our model — they add/remove/reorder **blocks within section regions**. This keeps the page skeleton consistent while content is flexible.

---

## Data architecture

### Metaobjects

Defined in Shopify admin, not code. The theme queries them via GraphQL Storefront API or Liquid `metaobject` access.

**Farm**
| Field | Type | Purpose |
|---|---|---|
| name | single_line_text | "Palestinian Rumi Grove" |
| region | metaobject_reference (Region) | Geographic context |
| country | single_line_text | "Palestine" |
| established_year | number_integer | Trust signal |
| story | multi_line_text | Narrative copy for PDP farm block |
| harvest_season | single_line_text | "October–November" |
| hero_image | file_reference | Farm photograph |
| farmer | metaobject_reference (Farmer) | Linked farmer entry |

**Farmer**
| Field | Type | Purpose |
|---|---|---|
| name | single_line_text | — |
| photo | file_reference | Portrait shot |
| generation | number_integer | "4th generation" |
| quote | multi_line_text | Pull quote for PDP |
| farm | metaobject_reference (Farm) | Back-reference |

**Region** — climate, soil type, map image, parent country
**Certification** — name, certifying body, certificate PDF, verified date
**Recipe** — name, hero image, ingredients list, steps, linked products

### Product metafields (typed)

- `custom.tasting_notes` — list.single_line_text (e.g., "peppery, grassy, robust")
- `custom.harvest_date` — date
- `custom.altitude_meters` — number_integer
- `custom.processing_method` — single_line_text ("cold-pressed", "raw", "stone-milled")
- `custom.certifications` — list.metaobject_reference (Certification)
- `custom.farm` — metaobject_reference (Farm)
- `custom.pairings` — list.product_reference
- `custom.recipe_suggestions` — list.metaobject_reference (Recipe)

### Why this matters

- **Merchant never touches code** to update content. They edit metaobjects and metafields in Shopify admin.
- **Theme queries are typed.** We get IDE autocomplete via MCP and Shopify's generated GraphQL types.
- **Linking preserves relationships.** A product references a farm references a farmer references a region — the PDP can render this chain without joins.

---

## CSS architecture (cascade order)

Loaded in this order in `layout/theme.liquid`:

```
1. assets/theme.css       ← design tokens (CSS custom properties only)
2. assets/base.css        ← element defaults, reset extensions
3. assets/utilities.css   ← .stack, .cluster, .mx-auto, .fs-xl, etc.
4. assets/components.css  ← .button, .badge, .input, .card
5. Inline merchant overrides injected by layout.liquid
6. Section/block scoped styles (loaded per-section via {% stylesheet %})
```

**Rules:**
- Tokens are the only layer that defines colors, spacing, fonts. Nothing else hardcodes.
- Utilities do layout + micro-typography. Not a full Tailwind — targeted subset.
- Components are shared visual primitives. No page-specific styles.
- Section/block styles are scoped to their template and loaded lazily.

---

## JavaScript architecture

**Framework:** none. Vanilla JS + Web Components.

**Pattern:** One Web Component per interactive element. Components register themselves in `assets/theme.js`.

**Examples to ship across the project:**
- `<kg-cart-drawer>` — cart drawer (Day 9)
- `<kg-quick-view>` — PDP quick view modal
- `<kg-predictive-search>` — search autocomplete (Day 12)
- `<kg-quiz>` — Build Your Pantry quiz (Day 10)
- `<kg-variant-picker>` — PDP variant selector (Day 7)
- `<kg-announcement-bar>` — dismissible announcement (Day 4)

**Why Web Components over framework:**
- Shopify themes have constraints (one bundle, limited JS budget). A framework adds 30–100KB before a single feature ships.
- Web Components are native and cached indefinitely by the browser.
- No framework release treadmill — 2026 code still runs in 2030.
- Claude Code MCP integration handles the DX gap that historically made Web Components verbose.

Logged as ADR-002 on Day 5.

---

## Request lifecycle (first paint, homepage)

1. Merchant storefront request → Shopify CDN → renders `templates/index.liquid`
2. `layout/theme.liquid` wraps: loads `theme.css` (tokens) + base/utilities/components + injected merchant overrides (one inline `<style>` block)
3. `sections/header.liquid` renders — evaluates block tree, inlines critical CSS for header
4. Main content renders — either from static content or JSON preset
5. `sections/footer.liquid` renders
6. `assets/theme.js` loads deferred — registers Web Components
7. Sentry init (when added Day 3) fires — wrapped in `if (window.__KG_SENTRY_DSN__)` to no-op in dev

---

## Internationalization and RTL

- All user-facing strings extracted to `locales/en.default.json` by Day 17. No hardcoded copy in `.liquid` files.
- Arabic via `locales/ar.json`.
- RTL is handled at the token layer (`[dir="rtl"] { --font-heading: Aref Ruqaa; --font-body: IBM Plex Sans Arabic; }`) plus CSS logical properties (`margin-inline-start` not `margin-left`).
- `hreflang` and `lang` + `dir` attrs set in `layout/theme.liquid` per locale.

---

## Security

- **CSP** applied via `<meta http-equiv="Content-Security-Policy">` in `layout/theme.liquid` and reinforced by Shopify's response headers. Specific policy lives in `docs/SECURITY.md` (Day 11/19).
- **User input escape.** Every `{{ ... }}` outputting user input uses `| escape`. Wholesale form inputs are sanitized twice: client-side regex guard, server-side on Admin API payload.
- **Rate limiting.** Wholesale form has a localStorage-based client throttle (1 submission / 60 sec / IP in practice) plus Admin API rate limit handling.
- **No secrets in repo.** `.env` is gitignored; `.env.example` has placeholders only. CI reads secrets from GitHub repository secrets.

---

## Observability

- **Sentry** — frontend errors (Day 3). Uses `@sentry/browser` via CDN, loaded deferred.
- **Web Vitals** — LCP, CLS, INP reported as GA4 custom events (Day 3).
- **Shopify customer events** — `page_view`, `add_to_cart`, `begin_checkout`, `purchase` auto-emitted by Shopify, captured by GA4 + any other pixels.
- **Custom events** — `quiz_complete`, `subscription_selected`, `wholesale_inquiry`, `farm_story_viewed`, `feature_flag_exposed`.

---

## CI/CD branch strategy

```
main (production-ready)
  ├── staging (pre-prod QA)
  │   └── dev/<feature> (feature branches)
```

- `dev/*` push → auto-deploy to `kindred-grove-dev` theme env
- `staging` push → auto-deploy to `kindred-grove-staging`
- `main` push → auto-deploy to `kindred-grove-production` with manual approval gate

Branch protection on `main`: 1 PR review, strict status checks, linear history, no force push, no deletion.

---

## How to extend this theme (future developer onboarding)

1. Read `BUILD-LOG.md` first — it is the living source of truth.
2. Read the relevant ADRs for the area you are changing (see `docs/adr/`).
3. New UI primitive? Add to `blocks/` with a proper schema. Do not inline styles in sections.
4. New component style? Add to `assets/components.css`. Do not branch component styles per section.
5. New page template? Start from the Theme Blocks pattern, never copy a legacy section layout.
6. Commit with conventional commits and the `AI-assisted:` trailer if Claude Code wrote any part.
7. Run `shopify theme check` before pushing. CI blocks on violations.
