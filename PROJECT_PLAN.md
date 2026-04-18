# Project 1: Full Locked Plan (v3 — Production-Grade)

**Target role:** Shopify Developer — Anderson Collaborative (Miami, remote freelance)
**Goal:** Portfolio project that reads as **senior/staff-level production work**, not a "good learner project."
**Timeline:** 25 days (3.5 weeks)
**Quality bar:** CTO/agency reviewer spends 60 seconds and thinks *"This dev can run our Shopify practice."*
**Positioning strategy:** Premium clean-food DTC brand (halal by default, hospitality-rooted, ethically sourced) — mirrors agency-tier brands like Graza, Brightland, Joolies. Halal/heritage = trust signal, not marketing lead.

---

## 1. Brand Concept

### Working name: Kindred Grove
Alternate names (pick your favorite):
- **Kindred Grove** *(recommended — premium, universal, Graza-tier)*
- **Sunfig & Olive**
- **Harvest & Hearth**
- **Barakah Pantry**
- **Zaytun & Co.**
- **Olive & Ember**

### Brand story (one-liner)
> *"Single-origin pantry staples — olive oil, raw honey, premium dates, heirloom saffron, and black seed — sourced direct from family farms across the Mediterranean and Levant. Traceable to the harvest. Halal-certified. Built for the table where guests become family."*

### Mission
Bring the foundations of hospitality back to the modern pantry — traceable, ethical, rooted in 1,400 years of tradition, made for everyday use and for welcoming guests.

### Brand values
- Traceability — every product linked to the farm + farmer
- Fair trade — direct-to-farmer sourcing, no middlemen
- Heritage — honoring traditional farming methods
- Hospitality — food as the foundation of welcoming others
- Quality — cold-pressed, raw, single-origin, no fillers

---

## 2. Product Catalog (8–12 core SKUs)

### Oils
1. Cold-pressed Olive Oil — Palestinian Rumi (500ml / 1L)
2. Cold-pressed Olive Oil — Tunisian Chemlali (500ml)
3. Black Seed Oil — Ethiopian (100ml)

### Dates
4. Medjool Dates — Jordan Valley (500g box)
5. Ajwa Dates — Medina (400g luxury gift tin)
6. Sukkari Dates — Saudi (500g)

### Honey
7. Raw Sidr Honey — Yemeni (250g jar)
8. Wildflower Mountain Honey — Turkish (250g jar)

### Spices & specialty
9. Saffron — Iranian Sargol grade (1g / 5g)
10. Black Seed Whole / Nigella (100g)
11. Za'atar blend — Levantine (100g)

### Gift sets
12. "The Foundations" Hospitality Box — olive oil + dates + honey + za'atar

---

## 3. Positioning (USA/EU Agency-Friendly)

### Hero messaging (do NOT lead with "halal" or "Muslim")
- Above fold: *"From the grove to your table. Single-origin, traceable, honored traditions."*
- Trust signals in footer/PDP: Halal-certified • Fair-trade • Single-origin • Cold-pressed • Family-farmed

### Target audiences (4 segments)
1. Health-conscious non-Muslims (biggest US/EU segment)
2. Ethical/sustainability shoppers
3. Foodies / home cooks
4. Muslim consumers

### Competitive reference brands (what agency sees)
- Graza, Brightland, Joolies, Bateel, Fly By Jing, Manuka Health

---

## 4. Tech Stack (all free, 2026-current)

### Core
| Layer | Tool |
|---|---|
| Store | Shopify Partner dev store (free) |
| Theme architecture | **Theme Blocks (Horizon-style, 8-level nested)** — not legacy sections |
| Language | Liquid, Vanilla JS (Web Components), modern CSS |
| Data | Metaobjects + Metafields |
| APIs | GraphQL Storefront API + REST Admin API |

### AI workflow (core differentiator)
| Tool | Use |
|---|---|
| **Shopify AI Toolkit / Dev MCP Server** | Connect Claude Code directly to Shopify docs + GraphQL schemas + store |
| **Claude Code** | Primary AI dev agent |
| **Cursor** | Secondary AI pair (for comparison in workflow doc) |
| **GitHub Copilot / Codex** | Inline suggestions + review |

### CI/CD + Quality
| Tool | Use |
|---|---|
| GitHub Actions | CI pipeline |
| **Shopify Lighthouse CI Action** | Performance budget enforcement on every PR |
| **theme-check** | Liquid linting in CI |
| **Playwright** | E2E tests (add-to-cart, checkout, quiz, wholesale) |
| **axe-core CLI** | Accessibility tests in CI |
| **Percy free tier** | Visual regression |

### Observability
| Tool | Use |
|---|---|
| **Sentry free tier** | Frontend error tracking |
| GA4 + Meta Pixel (via Web Pixels API) | Analytics |
| **Web Vitals library** | Real User Monitoring → GA4 custom events |

### 3rd-party integrations
| Tool | Use |
|---|---|
| Klaviyo free tier | Email + abandoned cart |
| Judge.me free | Reviews + schema |
| Shopify Search & Discovery | Search/filter |
| Shopify Subscriptions app | Native subscriptions |
| `<model-viewer>` + sample `.glb` | 3D product view |

### Deployment + Hosting
| Tool | Use |
|---|---|
| Shopify CLI | Theme deploy |
| 3 theme environments | `dev` → `staging` → `production` |
| **Cloudflare Pages** | Case study site + styleguide page |
| GitHub (public) | Repo with branch protection rules |

### Docs / Video
| Tool | Use |
|---|---|
| Loom free | Walkthroughs |
| Figma free | Designs |
| Unsplash / Pexels | Stock photography |

---

## 5. Pages Scope (14 templates)

1. **Homepage**
2. **Collection (PLP)** — filters, sort, quick view
3. **Product (PDP)** — gallery + 3D bottle, variant picker, subscription, farm story, recipes, FAQ
4. **Cart drawer**
5. **Search** — predictive with products + farms + recipes
6. **Origins / Farm pages** — metaobject-driven
7. **Build Your Pantry Quiz**
8. **Recipes blog**
9. **Wholesale page** (B2B)
10. **Gift boxes**
11. **Account pages** — orders, subscriptions, saved addresses
12. **Checkout** — Shopify native + 1 Checkout UI extension
13. **Styleguide page** — component library (/pages/styleguide)
14. **404 + policies**

---

## 6. Custom Features

### Primary
- Build Your Pantry Quiz (multi-step → metafields → recommendations)
- Subscription builder
- Origin / farm storytelling (metaobject-driven)
- Wholesale inquiry form (→ Admin API draft order, with rate limiting + sanitization)
- Predictive search (GraphQL)
- Cart drawer with free ship bar + upsell
- Quick view modal
- Gift flow (notes + scheduled delivery)
- 3D bottle view (`<model-viewer>`)
- Recently viewed (localStorage)
- Low-stock urgency
- Exit-intent email capture
- **Feature flag system** (localStorage-based, mocks A/B infra)

### Secondary
- Pairings widget
- Ramadan countdown (seasonal)
- Recipe save/bookmark

---

## 7. Data Architecture (Metaobjects + Metafields)

### Metaobjects
- **Farm** — name, region, country, photo, farmer link, established year, story, harvest season
- **Farmer** — name, photo, generation, quote, farm link
- **Region** — name, country, climate, soil, map
- **Certification** — name (Halal, Organic, Fair Trade), body, certificate PDF, verified date
- **Recipe** — name, hero image, ingredients, steps, linked products

### Metafields (on products)
- `tasting_notes` (list)
- `harvest_date` (date)
- `altitude` (number)
- `processing_method` (text)
- `certifications` (list → Certification metaobjects)
- `farm` (→ Farm metaobject)
- `pairings` (list → products)
- `recipe_suggestions` (list → Recipe metaobjects)

### Why
Merchant edits everything via theme editor + metaobject admin. You never touch code to update content. Modern Shopify architecture — what agencies sell to premium clients.

---

## 8. Professional Layer (quality bar)

### Performance (Lighthouse 95+)
- Critical CSS inline, async load rest
- Lazy load images + iframes
- WebP/AVIF via Shopify CDN, responsive `srcset`
- Preload hero image + key fonts
- Defer non-critical JS
- Minimal 3rd-party scripts
- No jQuery, no heavy libs
- Core Web Vitals all green
- **Performance budget enforced in CI** (`budget.json`)

### Accessibility (WCAG 2.1 AA — automated + manual)
- Semantic HTML, proper landmarks
- ARIA labels + live regions
- Keyboard navigation + visible focus
- Skip links
- Color contrast ≥ 4.5:1
- Screen-reader tested (VoiceOver + NVDA)
- **axe-core CLI in CI** — fails PR on violations
- axe DevTools clean report at ship

### SEO
- JSON-LD schema: Product, Organization, FAQ, Breadcrumb, Review, Article, Recipe
- Meta + Open Graph + Twitter cards
- Sitemap + robots.txt
- Canonical URLs
- `hreflang` for i18n

### Internationalization
- English + Arabic locale files
- Multi-currency (USD + EUR + GBP)
- RTL CSS for Arabic
- `hreflang` correctly set

### Security (new)
- Content Security Policy (CSP) via theme `<meta>` + `<link>` directives
- XSS prevention: escape all user input (`| escape`), sanitize wholesale form
- Rate limiting on wholesale form (localStorage-based client throttle + server-side via Admin API)
- No secrets in repo (checked by CI)
- Dependabot enabled

### Observability (new)
- **Sentry** frontend error tracking (free tier)
- **Web Vitals library** → custom GA4 events for RUM
- Shopify customer events (add_to_cart, begin_checkout, purchase)
- Custom events: quiz_complete, subscription_selected, wholesale_inquiry, farm_story_viewed, feature_flag_exposed

### Testing (new)
- **Playwright E2E**: 5 golden-path tests
  1. Homepage → PDP → add to cart → cart drawer
  2. Quiz flow → recommended products → add all to cart
  3. Subscription signup on PDP
  4. Wholesale form submission (mocked)
  5. Search → filter → product click
- **axe-core CLI**: accessibility tests in CI on 5 key pages
- **Percy**: visual regression snapshots on main templates
- **theme-check**: Liquid linting in CI
- **Shopify Lighthouse CI**: performance + a11y thresholds in CI

### AI workflow (differentiator)
- **Shopify Dev MCP Server** connected to Claude Code (official 2026 standard)
- All AI-assisted commits labeled in commit message
- `AI-WORKFLOW.md` — prompts library, velocity log, before/after examples
- `AI_GOVERNANCE.md` — what AI wrote vs. what you rewrote, safety rules, review checklist
- Loom demo: Claude Code + MCP solving a real debug issue with Shopify context

---

## 9. CI/CD & Branching Strategy (new)

### Branches
```
main (production-ready)
  ├── staging (pre-prod QA)
  │   └── dev/<feature> (feature branches)
```

### Environments (3 theme environments)
- `dev` theme — auto-deployed from any `dev/*` branch
- `staging` theme — deployed from `staging` branch
- `production` theme — deployed from `main`

### GitHub Actions workflows
1. `theme-check.yml` — Liquid linting on every PR
2. `lighthouse-ci.yml` — Shopify Lighthouse CI on every PR
3. `e2e.yml` — Playwright tests on every PR
4. `accessibility.yml` — axe-core CLI on every PR
5. `visual-regression.yml` — Percy snapshots on every PR
6. `deploy-dev.yml` — push dev branch → dev theme
7. `deploy-staging.yml` — push staging → staging theme
8. `deploy-production.yml` — push main → production theme (manual approval)

### Branch protection (main)
- Require PR + 1 approval (self-review allowed for solo)
- Require all CI checks pass
- Require branches up-to-date

---

## 10. Documentation Bundle (12 docs)

Living in `/docs/`:

| File | Purpose |
|---|---|
| `README.md` | Setup, quickstart, overview |
| `ARCHITECTURE.md` | Tech choices, folder structure, metaobject schema |
| `CONTRIBUTING.md` | Dev onboarding (setup, test, commit, PR process) |
| `AI-WORKFLOW.md` | Prompts library, velocity log, before/after |
| `AI_GOVERNANCE.md` | AI usage rules, review checklist, what AI did/didn't |
| `PERFORMANCE.md` | Before/after Lighthouse, Core Web Vitals, optimization log |
| `ACCESSIBILITY.md` | WCAG checklist, axe reports, manual test log |
| `SECURITY.md` | CSP, XSS protections, sanitization patterns |
| `TESTING.md` | E2E strategy, test run guide |
| `CHANGELOG.md` | Version history |
| `ROADMAP.md` | Phase 2 (Hydrogen), Phase 3 (custom app), future features |
| `MERCHANT-GUIDE.md` | How the client operates the theme editor |

### ADR folder (`/docs/adr/`)
5–8 Architecture Decision Records:
- ADR-001: Why Theme Blocks over Legacy Sections
- ADR-002: Why Vanilla JS + Web Components over Alpine/React
- ADR-003: Why Metaobjects-first over Metafields-only
- ADR-004: Why Shopify Dev MCP over docs-only Claude Code
- ADR-005: Why Sentry over Grafana Faro
- ADR-006: Why Cloudflare Pages over Vercel for case study
- ADR-007: Why Playwright over Cypress
- ADR-008: Why localStorage feature flags over third-party service

Each ADR: **Context → Decision → Consequences** format.

---

## 11. 25-Day Build Plan

### WEEK 1 — Foundation + CI from Day 1

#### Day 1: Setup, Brand, MCP Server
- Create Shopify Partner account + 1 dev store
- **Install Shopify Dev MCP Server + connect Claude Code (priority task)**
- Verify Claude Code has access to Shopify docs + GraphQL schema via MCP
- Install Shopify CLI, theme-check, Node.js
- Init GitHub repo (public) with branch protection on `main`
- Create 3 theme environments: dev / staging / production
- Figma: brand colors, typography, logo sketch (2–3 hrs)
- Brand brief (1-page): mission, values, tone
- Fictional client SOW doc
- Start logging prompts in `AI-WORKFLOW.md` from commit #1

#### Day 2: Theme Scaffolding (Theme Blocks Architecture)
- `shopify theme init` with Theme Blocks architecture (NOT legacy Dawn sections)
- Folder structure: `sections/`, `blocks/`, `snippets/`, `templates/`, `config/`, `locales/`, `assets/`, `docs/`, `docs/adr/`
- Write ADR-001: Why Theme Blocks over legacy Sections
- Base layout (`layout/theme.liquid`) with semantic HTML + CSP meta
- Design tokens in `config/settings_schema.json`
- CSS architecture: base → tokens → utilities → components
- Liquid snippet library (buttons, icons, images, form controls)
- **Setup GitHub Actions: `theme-check.yml`** (PR blocker)

#### Day 3: CI/CD Pipeline Full Setup
- Setup `lighthouse-ci.yml` with Shopify Lighthouse CI Action + `budget.json` (perf budget)
- Setup `accessibility.yml` with axe-core CLI
- Setup `deploy-dev.yml`, `deploy-staging.yml`, `deploy-production.yml`
- Configure Sentry project, add to theme
- Add Web Vitals library + GA4 RUM reporting skeleton
- Write ADR-004: Why Shopify Dev MCP over docs-only Claude Code
- Write ADR-005: Why Sentry over Grafana Faro

#### Day 4: Header + Footer + Navigation + Styleguide Page
- Header theme block with logo, nav, cart, search, language/currency switcher
- Mobile menu drawer
- Footer with newsletter, links, trust badges, social
- Announcement bar (dismissible, merchant-editable)
- Styleguide page (`/pages/styleguide`) scaffold — will grow as components ship
- Initial Percy visual regression snapshot

#### Day 5: Homepage
- Hero block (image + text + CTA)
- Values strip block
- Featured collections block
- Farm story block (metaobject-driven)
- Reviews carousel block (Judge.me placeholder)
- Newsletter block (Klaviyo form)
- Instagram/UGC strip block
- Write ADR-002: Why Vanilla JS + Web Components

#### Day 6: Collection Page (PLP)
- `collection.liquid` template
- Filter system as nested theme blocks
- Sort dropdown
- Lazy-loaded product card component
- Pagination / infinite scroll
- Quick view modal

#### Day 7: Product Page (PDP) — Part 1
- `product.liquid` template
- Gallery with thumbs + main (swipe mobile)
- Variant picker with custom logic
- ATC button with loading state
- Price display with subscription toggle
- Breadcrumbs + JSON-LD schema
- Meta descriptions + OG tags

**End of Week 1:** Live dev store, homepage + PLP + basic PDP, full CI pipeline running on every PR, MCP server connected, Sentry live. Commit `v0.1-foundation`.

---

### WEEK 2 — Features + Integrations + Testing

#### Day 8: PDP — Part 2 (Complex features)
- Farm story block (metaobject)
- Certifications badges block
- Recipe suggestions block (metaobject)
- Product FAQ accordion
- Recently viewed (localStorage)
- Recommendations (Shopify API)
- 3D model-viewer on olive oil PDP
- Write ADR-003: Why Metaobjects-first

#### Day 9: Cart Drawer + Checkout Extension
- Cart drawer with slide animation
- Free shipping progress bar
- Cart upsell section
- Gift note field
- Checkout UI extension: trust badges block
- Deploy extension via Shopify CLI

#### Day 10: Build Your Pantry Quiz + Feature Flags
- Multi-step quiz (Web Component)
- State management in vanilla JS
- Writes result to customer metafield via Ajax API
- Recommendation logic + CTA
- Feature flag system (localStorage-based, documented for A/B)
- Write ADR-008: localStorage feature flags

#### Day 11: Wholesale + Origin Pages + Security
- Wholesale page with form (name, business, volume, message)
- **Input sanitization + rate limiting (CSP + client-side throttle)**
- Form → Admin API draft order creation
- Origin/farm detail template (metaobject-driven)
- `SECURITY.md` doc
- Write ADR-007: Why Playwright

#### Day 12: Predictive Search + Integrations
- Predictive search (GraphQL, debounced 300ms)
- Shows products + farms + recipes
- Klaviyo setup (email capture + abandoned cart flow)
- Judge.me reviews installed + Review schema.org markup

#### Day 13: Analytics + RUM + Error Tracking Verification
- GA4 enhanced ecommerce via Web Pixels API
- Meta Pixel + Conversions API
- Custom events wired (quiz_complete, subscription_selected, etc.)
- Web Vitals → GA4 custom events (RUM)
- Sentry test errors fired + verified dashboard
- Google Tag Assistant validation

#### Day 14: Playwright E2E Test Suite
- Install Playwright, configure for Shopify dev store
- Test 1: homepage → PDP → add to cart → cart drawer
- Test 2: quiz flow → recommendations → add to cart
- Test 3: subscription signup on PDP
- Test 4: wholesale form submission (mocked)
- Test 5: search → filter → product click
- Add `e2e.yml` GitHub Action (PR blocker)
- Write `TESTING.md` doc

**End of Week 2:** Fully functional store with all features, E2E tests in CI, analytics + RUM + error tracking live, 4 ADRs written. Commit `v0.2-features`.

---

### WEEK 3 — Quality + Security + Observability

#### Day 15: Accessibility Pass (automated + manual)
- Run axe DevTools on every page
- Run `axe-core` CLI on all templates
- Keyboard navigation QA (tab order, focus traps)
- Screen reader test (VoiceOver + NVDA)
- Color contrast audit — fix below 4.5:1
- ARIA labels + landmarks audit
- Skip links + heading hierarchy
- Fix all violations → clean CI report
- Update `ACCESSIBILITY.md`

#### Day 16: Performance Pass
- Lighthouse baseline audit (record metrics)
- Critical CSS extraction, inline above-fold
- Image optimization audit (WebP/AVIF)
- Preload hero + fonts
- Defer non-critical JS
- Eliminate render-blocking resources
- Performance budget in `budget.json` tightened
- Target Lighthouse 95+ all 4 categories
- Update `PERFORMANCE.md`

#### Day 17: i18n + RTL
- Extract all hardcoded text to `locales/en.default.json`
- `locales/ar.json` with Arabic translations
- Multi-currency (USD / EUR / GBP)
- `hreflang` tags
- RTL CSS for Arabic (layout mirror with logical properties)
- Test language + currency switchers

#### Day 18: SEO + Schema
- JSON-LD Product schema every PDP
- Organization schema homepage
- FAQ schema on FAQ blocks
- Breadcrumb + Review + AggregateRating schema
- Article + Recipe schema
- Sitemap + robots.txt verified
- Meta descriptions + OG + Twitter cards
- Google Rich Results test

#### Day 19: Security Hardening
- Content Security Policy via `<meta>` + headers
- Review all Liquid outputs — `| escape` everywhere user input flows
- Wholesale form rate limiting tested
- Dependabot enabled on repo
- No-secrets CI check (e.g., gitleaks)
- Update `SECURITY.md`
- Write ADR-006: Why Cloudflare Pages

#### Day 20: Merchant Experience + Styleguide Polish
- Every theme block has clean schema (label + info + default)
- Presets for common layouts
- Client (you) tests full editor flow end-to-end
- Styleguide page documents all components + states + variants
- Visual regression baseline re-captured in Percy
- Write `MERCHANT-GUIDE.md`

#### Day 21: Documentation Sprint
- `README.md` — setup, quickstart, overview
- `ARCHITECTURE.md` — tech choices, folder structure, metaobjects
- `CONTRIBUTING.md` — dev onboarding (setup, test, commit, PR)
- `AI-WORKFLOW.md` — prompts, velocity log, before/after
- `AI_GOVERNANCE.md` — AI usage rules, review checklist
- Finalize all 8 ADRs
- `CHANGELOG.md` — version history
- `ROADMAP.md` — Phase 2 (Hydrogen), Phase 3 (custom app), Phase 4 (A/B infra)

**End of Week 3:** Production-grade quality, security hardened, 12 docs + 8 ADRs live, all CI gates passing. Commit `v0.9-rc`.

---

### WEEK 4 — Deliverables (4 Days)

#### Day 22: Case Study Site (Cloudflare Pages)
- Static site: Astro or plain HTML+CSS
- Sections:
  - Hero with brand logo
  - Challenge (fake client brief)
  - Approach (decisions + tradeoffs, link to ADRs)
  - Solution (feature tour with screenshots)
  - Results (Lighthouse, Core Web Vitals, axe, projected conversion lift claim)
  - Tech Stack (icons + brief why)
  - AI Workflow section (MCP demo, prompts, velocity)
  - Live store + GitHub + Loom links
- Deploy to Cloudflare Pages

#### Day 23: Loom Walkthrough (5 min)
Recorded live:
- 0:00–1:00 → Brand intro + site tour
- 1:00–2:00 → Theme editor demo (merchant POV)
- 2:00–3:00 → Code walkthrough (1 complex feature)
- 3:00–4:00 → **AI + MCP demo** (Claude Code with MCP server debugging a live issue)
- 4:00–5:00 → Results + metrics

#### Day 24: Lessons Learned + Retrospective + Final QA
- Write "Lessons Learned" blog post on case study site:
  - What surprised me
  - What AI changed about my workflow
  - What I'd do differently
  - Where AI fell short
- Cross-browser QA (Chrome, Safari, Firefox, Edge)
- Device QA (iOS Safari, Android Chrome, tablet)
- Broken link check
- Final ADR pass

#### Day 25: Ship It
- Final visual regression baseline (Percy)
- Tag `v1.0-release` in Git
- Run full CI suite → all green
- Production deploy
- Update case study site with final URLs
- Submit/share portfolio

---

## 12. Final Deliverables

1. **Live Shopify dev store URL** — `kindred-grove.myshopify.com`
2. **GitHub repo** (public)
   - Clean conventional commits
   - Branch protection on `main`
   - 8 GitHub Actions workflows green
   - 12 docs + 8 ADRs
   - Semantic version tags
3. **Case study site** (Cloudflare Pages)
4. **Loom walkthrough** (5 min) including MCP + Claude Code demo
5. **Lessons Learned blog post**
6. **Metrics proof:**
   - Lighthouse 95+ screenshots (all 4 categories)
   - WebPageTest waterfall
   - axe DevTools clean report
   - Core Web Vitals screenshot
   - Sentry dashboard (showing zero errors at ship)
   - Playwright test run video
7. **Client-style deliverables:**
   - SOW
   - Project timeline
   - Merchant handoff guide
   - Roadmap

---

## 13. JD Coverage Check

### Must-haves (100%)
| JD Requirement | Covered |
|---|---|
| Liquid, JS, HTML, CSS | ✅ Full custom theme with Theme Blocks |
| AI coding tools | ✅ **Shopify Dev MCP + Claude Code + Cursor + Copilot** |
| Custom theme development | ✅ Built from scratch, Theme Blocks architecture |
| Shopify APIs + 3rd-party | ✅ GraphQL + REST + Admin + Klaviyo + Judge.me |
| Performance + CRO | ✅ Lighthouse 95+, Core Web Vitals green, perf budget in CI |
| Independent work + speed | ✅ 25-day delivery |
| Clean documented code | ✅ 12 docs + 8 ADRs + conventional commits |

### Nice-to-haves (3 of 4 covered)
| JD Nice-to-have | Covered |
|---|---|
| Shopify Plus | ✅ Partial — Checkout UI extension (Plus-level skill demo) |
| Headless (Hydrogen / Next.js) | ⚪ Phase 2 in roadmap |
| E-commerce agency feel | ✅ SOW + case study + handoff + DTC positioning |
| SEO + page speed | ✅ JSON-LD everywhere + Lighthouse 95+ |

### Senior-signal additions (beyond JD)
- ✅ CI/CD pipeline (8 workflows)
- ✅ E2E tests (Playwright)
- ✅ Accessibility automation (axe-core CLI)
- ✅ Visual regression (Percy)
- ✅ Error tracking (Sentry)
- ✅ Real User Monitoring (Web Vitals)
- ✅ Security layer (CSP, sanitization, rate limiting)
- ✅ Multi-env branching (dev/staging/prod)
- ✅ ADRs (8 decisions documented)
- ✅ AI governance doc
- ✅ Shopify Dev MCP integration
- ✅ Theme Blocks architecture (Horizon-style, 2026 standard)
- ✅ Developer onboarding doc
- ✅ Product roadmap
- ✅ Lessons learned retrospective
- ✅ Feature flag system
- ✅ Component library / styleguide page

---

## 14. Out of Scope

- Hydrogen / headless rebuild (Phase 2)
- Real paid Shopify Plus subscription
- Custom Shopify app (Node/Remix standalone) — Phase 3
- Real third-party A/B platform (GrowthBook / PostHog) — mocked with feature flag system
- Custom 3D modeling (sample `.glb` only)
- PWA / service worker
- Custom domain (use `*.myshopify.com`)
- Full synthetic monitoring

---

## 15. Pre-Flight Checklist

Before Day 1:
- [ ] Decide final brand name
- [ ] Confirm 25-day timeline fits your availability (~4–5 hrs/day)
- [ ] Install locally: Node.js, Shopify CLI, Git, VS Code + Cursor, Claude Code CLI
- [ ] Sign up (all free): Shopify Partner, GitHub, Cloudflare, Klaviyo, Sentry, Percy, Loom, Figma
- [ ] Bookmark: Shopify dev docs, Liquid reference, metaobjects guide, Theme Blocks docs, Shopify AI Toolkit docs
- [ ] Set up project folder locally: `~/projects/kindred-grove/`
- [ ] Review Shopify Dev MCP setup guide

---

## 16. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Timeline slip | Trim in this order: 3D model → Arabic RTL → Recipes blog → Checkout extension |
| Lighthouse below 95 | Perf budget enforced in CI from Day 3, not Day 16 |
| A11y findings late | axe-core CLI in CI from Day 3 — catches violations on every PR |
| MCP setup blocker | Fall back to Claude Code without MCP on Day 1, add MCP later — don't block progress |
| AI workflow doc thin | Log prompts daily, commit message discipline |
| Security oversight | CSP + sanitization from Day 11, not Day 19 |
| Visual regressions | Percy baseline from Day 4 |
| CI flakiness | Keep CI fast (<5 min full suite), retry logic on Playwright |

---

## 17. Success Metric

**The 60-second test:** When a CTO / agency reviewer spends 60 seconds on your portfolio, they should see:

1. Live Shopify store → "Looks like Graza"
2. GitHub repo → "8 green CI workflows, clean commits, 12 docs, ADRs"
3. Case study site → "Real client framing, metrics proof, AI workflow demo"
4. Loom → "This person uses MCP + Claude Code like a senior. Ship velocity is real."

**If any of those 4 signals are missing, the portfolio is not ready.**

---

## 18. What This Plan Now Signals

| Bar | Your plan delivers |
|---|---|
| Junior Shopify dev | ✅ Far exceeded |
| Mid-level Shopify dev | ✅ Far exceeded |
| Senior Shopify dev at agency | ✅ Matched |
| Staff / lead at agency | ✅ Matched with CI + observability + ADRs |
| CTO reading this | ✅ Signals "product engineer who thinks about systems" |

This is no longer "a strong portfolio project." This is **production-grade work that reads as 3+ years experience, even though the timeline is 25 days.**
