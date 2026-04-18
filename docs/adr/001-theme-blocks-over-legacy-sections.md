# ADR-001 — Theme Blocks over Legacy Sections

**Status:** Accepted
**Date:** 2026-04-19 (Day 2)
**Deciders:** Zahidul Islam (developer) on behalf of the Kindred Grove engagement

---

## Context

Shopify themes can be built in two architectural patterns:

**Legacy Sections pattern** (Dawn-era, pre-2024):
Each page layout is hard-coded into `sections/*.liquid` files. Merchants can reorder sections in the theme editor, but **cannot nest content blocks inside sections beyond one shallow level**. Re-using a block shape across sections means copy-paste. Section schemas are inflexible. Most Shopify themes sold on the Shopify Theme Store before 2024 use this pattern, and most tutorial content online still teaches it.

**Theme Blocks pattern** (Horizon-era, 2024 GA, 2026 default):
Introduced alongside Shopify's Horizon theme and promoted across the 2024–2026 Developer Experience roadmap. Content is composed from `blocks/*.liquid` primitives that nest **up to eight levels deep** inside static sections, app blocks, and other blocks. Blocks are reusable, schema-driven, and editable by the merchant with true nesting (merchant can put a button block inside a card block inside a column block inside a section, all in the theme editor). This is the pattern Shopify itself is building future themes on and is the implicit expectation when a 2026 agency client says "custom Shopify theme".

The choice is exclusive at architecture time — mixing both is possible but produces an inconsistent merchant experience and undermines the portfolio story.

## Decision

**We build Kindred Grove on Theme Blocks from Day 2 onward.** No Dawn-era sections. Every content composition inside page templates is done via block nesting.

## Consequences

### Positive

- **Merchant experience:** Kindred Grove's future staff can compose any layout in the theme editor without a developer. A new promo block, a reordered hero, a Ramadan countdown — all merchant-editable without a PR.
- **Agency signal:** Theme Blocks is the 2026 gold standard. Showing up with Theme Blocks on the portfolio distinguishes the work from the majority of Shopify freelancers still shipping Dawn-era themes.
- **Reusability:** A `button` block is written once and composes inside card, hero, modal, feature, banner — anywhere. No copy-paste variants.
- **Schema-driven settings:** Each block owns its settings schema. Setting-set reuse is clean.
- **Horizon-aligned:** If Shopify ships a new layout primitive on Horizon, Kindred Grove inherits it with a minor version bump.
- **Future APIs:** Shopify's upcoming composability APIs (Checkout blocks, Customer Account blocks) follow the same pattern. Adopting the model now means no rewrite later.

### Negative / accepted tradeoffs

- **Learning tax:** Less tutorial content exists for Theme Blocks. We absorb the research cost by using Shopify Dev MCP to query official docs directly, not Stack Overflow.
- **Ecosystem lag:** Some third-party Shopify apps still ship sections only, not blocks. When we integrate such an app (Judge.me reviews on Day 12), we wrap its output in a block-compatible wrapper rather than adopting the section.
- **Merchant guidance:** Because the theme editor is so flexible, we must ship clear `MERCHANT-GUIDE.md` documentation so Kindred Grove staff don't paint themselves into a design corner.

### Neutral

- Build effort for initial templates is comparable to Sections. The time investment shifts from writing sections to writing block primitives once, then composing fast.

## Alternatives considered

1. **Stay on Dawn-era Sections** — rejected. Would undersell the portfolio; merchant experience is measurably worse; doesn't match Anderson Collaborative's 2026 client expectations.
2. **Hybrid (Sections for layout, Blocks within)** — rejected. Inconsistent merchant experience; partial Theme Blocks adoption signals "didn't commit to the new architecture" rather than "chose deliberately".
3. **Hydrogen / headless** — rejected as Phase 1 scope (see `docs/SOW.md` §4). Hydrogen is the Phase 2 migration target and is a separate ADR when we get there.

## References

- Shopify Dev docs: Theme Blocks architecture overview (queried via `@shopify/dev-mcp`)
- Shopify Horizon theme repository (Shopify's reference implementation)
- Plan source: `PROJECT_PLAN.md:86-93` and §8 "AI workflow" differentiator framing.
