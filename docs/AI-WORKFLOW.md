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
- 3 theme environments created on the dev store:
  - `kindred-grove-dev` (ID 139677040699)
  - `kindred-grove-staging` (ID 139677073467)
  - `kindred-grove-production` (ID 139677106235)

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
- **AI commit percentage:** Commits containing `AI-assisted:` trailer ÷ total commits.
- **Human rewrite rate:** How often AI output was edited before committing (target: <30% — means first-draft quality is high).
- **MCP usage:** Number of times Shopify Dev MCP was queried during the build (proxy for "used MCP for real work, not just installed it").
- **Prompt reuse rate:** How many prompts from this doc got used more than once (library compounding).
