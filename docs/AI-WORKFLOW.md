# AI Workflow — Kindred Grove

> **Purpose:** Every AI-assisted commit, decision, and prompt logged here. This document is the agency differentiator — it proves the AI workflow is not just "ask ChatGPT, paste code" but a disciplined, reviewed, measured practice. Required reading for the case study (Day 22) and AI governance doc (Day 21).

---

## Tooling

| Tool | Role |
|---|---|
| **Claude Code (Opus 4.7, 1M context)** | Primary dev agent — drives file edits, Git, CI, deploys |
| **Shopify Dev MCP Server** | Gives Claude Code direct access to Shopify docs + GraphQL schemas + store APIs |
| **Claude Design** | Brand system generation (Day 1), component prototyping (on-demand) |
| **Cursor** | Secondary AI pair — for comparison in `docs/ARCHITECTURE.md` tradeoff section |
| **GitHub Copilot / Codex** | Inline suggestions + PR review assistance |

---

## Rules of Engagement

1. **AI writes, human reviews.** Nothing Claude produces ships without a human read. Exceptions: auto-generated boilerplate (commit messages from commit template, conventional-commit lints).
2. **Every AI-assisted commit is labeled.** Commit trailer format:
   ```
   AI-assisted: <scope> — <which tool>
   ```
3. **Prompt disclosure.** If a commit is the direct result of a specific prompt, the prompt goes in this doc under Session Notes with a link to the commit.
4. **Never commit AI-generated code without running local checks.** At minimum: `theme-check` (where applicable), format, basic manual sanity read.
5. **Reject AI output if:** it hallucinates APIs, uses deprecated patterns, violates accessibility, skirts security guidance, or introduces library dependencies without discussion.

---

## Prompts Library

### Phase category: Scaffolding / Setup

**Prompt: "Create project folder scaffold for a Theme Blocks Shopify theme"**
```
Create the standard folder structure for a Shopify theme built on Theme Blocks architecture (not legacy Dawn sections). Include: sections/, blocks/, snippets/, templates/, config/, locales/, assets/, docs/, docs/adr/, tests/, .github/workflows/. Add .gitignore (secrets, node_modules, Shopify temp, OS, editor) and .editorconfig (2-space indent, LF, UTF-8).
```
Used: Day 1, Phase A1. Resulted in commit `476c09d`.

**Prompt: "Write a 1-page brand brief for Kindred Grove"**
```
Kindred Grove is a premium halal pantry brand selling single-origin olive oil, dates, raw honey, saffron, and black seed. Positioned as premium clean food DTC (Graza-tier), NOT marketed as "Muslim brand" — halal is a trust signal alongside fair-trade, single-origin, cold-pressed. Write docs/BRAND-BRIEF.md covering: mission, 5 values (traceability, fair trade, heritage, hospitality, quality), voice/tone, 4 target audiences, positioning, visual direction (warm earth + olive green + gold), reference brands (Graza, Brightland, Joolies). This will be input for Claude Design.
```
Used: Day 1, Phase B1. Resulted in commit `d840e2d`.

### Phase category: Theme architecture (Day 2+)

*(To be populated as we build.)*

### Phase category: Features (Day 8+)

*(To be populated.)*

### Phase category: Quality + Observability (Day 15+)

*(To be populated.)*

---

## Velocity Log

Record how long tasks take with vs. without AI assistance where the comparison is meaningful.

| Task | Without AI (est.) | With AI (actual) | Multiplier |
|---|---|---|---|
| Brand brief (1 page) | 60 min | 8 min | 7.5× |
| SOW doc (~4 pages) | 2 hrs | 12 min | 10× |
| Initial folder scaffold + .gitignore + .editorconfig | 15 min | 2 min | 7.5× |

*Running average updated at each weekly checkpoint.*

---

## Before / After Examples

*(To be populated when we have meaningful comparison — e.g., accessibility pass, performance audit, complex component.)*

---

## Session Notes

### 2026-04-19 — Day 1: Foundation + MCP

**What happened:**
- Browser front-load completed (GA4, apps, signups).
- Meta Pixel skipped — Facebook Business Manager blocked new account with 404s. Reframed in case study as Phase 2.
- Figma replaced with Claude Design — Figma MCP requires $15/mo paid tier; Claude Design (research preview, user on Max 5x plan) offers equivalent workflow with zero additional cost.
- Project folder scaffolded; Git + GitHub public repo live at github.com/Zahidulislam2222/kindred-grove.
- Branch protection active on `main` (1 review, strict checks, linear history, no force push).
- Shopify Dev MCP Server installed (`@shopify/dev-mcp@latest`) and configured in `.mcp.json` (project-scoped). Verified `✓ Connected` in `claude mcp list`.
- Shopify CLI authenticated via device code flow to `kindred-grove.myshopify.com`.
- 3 theme environments created on the dev store (numeric IDs in local `.env`, referenced in CI via GitHub Secrets):
  - `kindred-grove-dev`
  - `kindred-grove-staging`
  - `kindred-grove-production`

**Decisions logged:**
- Theme bootstrap uses minimal `layout/theme.liquid`, `templates/index.liquid`, `config/settings_schema.json`, `config/settings_data.json` just to satisfy Shopify's "valid theme" requirement. Day 2 replaces with full Theme Blocks architecture.
- Theme env pushes created 3 warnings:
  1. `theme_author` was initially >25 chars (fixed: "Anderson Collaborative").
  2. `templates/gift_card.liquid` delete error on production push — harmless, resolved Day 2.

**Key AI productivity observation (Day 1):**
The resumable-workflow rule (BUILD-LOG.md + per-phase Git checkpoints + TaskList) is itself an AI governance win. Without it, a power cut or usage-limit interruption would cost 30+ min of re-orientation. With it, any new session can pick up in under 60 seconds.

---

## Metrics to track by Day 25

- **Velocity multiplier:** Running average of human-time vs. AI-assisted-time across comparable tasks.
- **AI commit percentage:** Commits containing `Co-Authored-By: Claude Opus 4.7` trailer ÷ total commits.
- **Human rewrite rate:** How often AI output was edited before committing (target: <30% — means first-draft quality is high).
- **MCP usage:** Number of times Shopify Dev MCP was queried during the build (proxy for "used MCP for real work, not just installed it").
- **Prompt reuse rate:** How many prompts from this doc got used more than once (library compounding).

---

## Days 11–21 session notes (2026-04-19 evening)

One extended session shipped the remaining SOW build-sprint work — Days 11 through 21 inclusive, plus a completion pass for three templates I glossed over (blog, gift-boxes, customer accounts).

### Per-day timing

| Day | Work | Wall-clock |
|---|---|---|
| 11 | Wholesale + origins + SECURITY.md + dependabot | ~90 min |
| 12 | Predictive search + Klaviyo + review schema | ~40 min |
| 13-15 | TESTING.md + ACCESSIBILITY.md | ~30 min |
| 16 | Inline critical CSS + lighthouserc.json + PERFORMANCE.md | ~30 min |
| 17 | Arabic locale (220 keys, CLDR plurals) + hreflang | ~25 min |
| 18 | 5 JSON-LD schema snippets + layout wiring | ~35 min |
| 19 | Gitleaks CI + SECURITY polish | ~20 min |
| 20 | MERCHANT-GUIDE.md (16 sections) | ~45 min |
| 21 | README + CONTRIBUTING + CHANGELOG + ROADMAP + AI_GOVERNANCE + LICENSE | ~60 min |
| 21 completion pass | Blog + article + gift-boxes + 7 customer-account templates + locale mirrors + CSS + doc refreshes | ~60 min |

### Notable moments

- **Unprompted debugging (Day 11):** `.gitignore` had accumulated an accidental `docs/` global ignore from an earlier edit — SECURITY.md wasn't getting tracked. Claude grep'd the gitignore, found the line, removed it. No prompt required.
- **Arabic locale (Day 17):** 220-key mirror with CLDR plurals for `reviews.results_count` (zero/one/two/few/many/other). Hand-write estimate ~4 hours; single file-write. Brand voice spot-check — no rewrites.
- **AI_GOVERNANCE honest weaknesses (Day 21):** I asked Claude to document where it's weakest. It self-identified four real categories from our actual session history (Shopify platform quirks, merchant-UX intuition, multi-commit coordination under pressure, anti-pattern detection in unfamiliar domains). Honest register, not sanitized.
- **Mid-session scope correction (completion pass):** Human audit caught 3 missing SOW templates I'd glossed over when I claimed "Day 1-21 done." Blog, gift-boxes, customer accounts. Built all three + locales + CSS in 60 min. **Lesson logged:** explicit cross-check against SOW's numbered deliverable list, not my own mental model.

### Aggregate for the full session

- **Total wall-clock:** ~8 hours focused.
- **Hand-coded estimate:** 35–50 hours (~4–6 working days — matches the SOW's Week 2–3 schedule).
- **Velocity multiplier:** ~5×.
- **Rewrites:** Low single digits — gitignore debug, hero preset schema mismatch, blog pagination Liquid syntax, paginate block wrapper, VariableName leading-underscore warnings.
- **Commits:** 11 tagged days (v0.0-day11 … v0.0-day21) + completion-pass commit.
- **Lines added:** ~5,200 across Liquid, JSON, CSS, JS, and Markdown.
- **CI regressions introduced:** 0 — theme-check green after every commit in the session.
