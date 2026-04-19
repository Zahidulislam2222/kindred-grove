# ADR-004 — Shopify Dev MCP over docs-only Claude Code

**Status:** Accepted
**Date:** 2026-04-19 (Day 3)
**Deciders:** Zahidul Islam (developer) on behalf of the Kindred Grove engagement

---

## Context

An AI pair-programming agent building a Shopify theme in 2026 can access Shopify knowledge three ways:

1. **Docs-only Claude Code** — the model answers from pre-training plus whatever the developer pastes into the prompt. The model has no live view of the current Shopify docs, the current GraphQL schema, or the target dev store.
2. **Web search / fetch** — the agent pulls `shopify.dev` pages on demand. Works, but the agent has to guess which URL holds the answer, pages are rendered HTML (token-heavy), and the GraphQL schema is not consumable this way at all.
3. **Shopify Dev MCP** — the official Model Context Protocol server published by Shopify (`@shopify/dev-mcp`) that exposes structured tools: doc search, GraphQL schema introspection, store-data introspection, and Admin/Storefront API query validation. The agent calls these tools like any other and gets back precisely-typed responses.

Kindred Grove is a 25-day build where the agent is writing production Liquid, GraphQL queries, and metaobject schemas on almost every phase. Getting those right on first pass is worth a non-trivial setup cost. Getting them wrong — for example, writing a GraphQL query against a field that was renamed in the 2025-10 API version — burns a whole verify cycle and shows up in the case study as a re-work commit.

The Shopify Dev MCP was installed on Day 1 (Phase D1–D6) and is already connected (`claude mcp list` reports connected). The decision now is whether to **commit** to MCP as the source of truth for Shopify knowledge in every phase, or to treat it as optional.

## Decision

**We treat Shopify Dev MCP as the authoritative Shopify-knowledge source for every task in the remaining build.** Docs-only recall and open-web search are fallbacks, not primary.

Operationally, this means:

- Before writing any GraphQL query, the agent introspects the schema via MCP.
- Before writing Liquid that touches a Shopify object (product, variant, metaobject, shop), the agent queries MCP docs for the current shape, not its pre-training.
- Before writing a Theme Blocks schema, the agent confirms the current merchant-editable field types via MCP.
- When the MCP answer is unambiguous, we do not web-search the same thing again.
- When the MCP answer is missing or stale, we escalate to web search and log the gap in `docs/AI-WORKFLOW.md`.

## Consequences

### Positive

- **Correctness floor lifted.** GraphQL queries compile against the real schema the first time. Liquid objects match the current API version. Metaobject field types are the ones Shopify actually accepts.
- **Token efficiency.** A structured MCP call returns ~300 tokens of exactly the right facts, instead of a 4,000-token rendered doc page with sidebar and footer.
- **Case study differentiator.** The majority of Shopify freelance developers in 2026 do not have MCP wired. The Loom walkthrough on Day 23 demos MCP solving a live debug — that is the signal Anderson Collaborative is screening for under "AI coding tools" in the JD.
- **Velocity data.** Every MCP call is logged in `docs/AI-WORKFLOW.md` velocity log. At ship time we can report concrete numbers (queries answered via MCP vs. escalated to web) — a quantified claim, not a vibe.
- **Self-documenting dependency pin.** The installed version (`@shopify/dev-mcp@1.12.0`) is recorded in `.mcp.json`, which is committed. Future-us and any reviewer can reproduce the exact tool surface we built against.

### Negative / accepted tradeoffs

- **Setup friction for reviewers.** Anyone cloning the repo to run the agent themselves needs to install the MCP server and authenticate. Mitigated by a one-line install step in `README.md` (shipped Day 21) and a no-MCP fallback note.
- **Agent latency on first call of a session.** MCP tools cold-start slower than the model answering from pre-training. Accepted; correctness > latency on a 25-day production build.
- **Opacity to humans reading commits.** When the agent cites "per MCP doc search," a human reviewer can't click through to a docs URL. Mitigated by `docs/AI-WORKFLOW.md` prompts log, which captures the MCP query and response snippet for every non-trivial usage.
- **Lock-in to Shopify's roadmap for MCP.** If Shopify deprecates or breaks the MCP, we fall back to web search. Low-probability risk; Shopify is actively investing in MCP as the 2026 AI-agent story.

### Neutral

- Works alongside Cursor and Copilot in the workflow. MCP is Claude-Code-scoped; the other tools still provide inline suggestions from their own context.

## Alternatives considered

1. **Docs-only Claude Code** — rejected. Pre-training cutoff is January 2026, and Shopify ships API versions quarterly (2025-04, 2025-07, 2025-10, 2026-01, 2026-04). Any query on fields changed in the last two quarters has a non-trivial error rate. Not defensible on a portfolio project reviewed by Shopify specialists.
2. **Raw web search only** — rejected as primary. Works for conceptual questions; fails for GraphQL schema introspection; token-expensive on every call; and gives the agent no structured way to validate store-level data (metaobjects, metafields, theme settings schema shape).
3. **Shopify CLI + local docs clone** — rejected. The CLI is already installed and used for deploy; its help output is not a knowledge surface. Cloning `shopify.dev` locally is a maintenance burden and still doesn't solve schema introspection.
4. **A third-party GraphQL IDE (Insomnia, Postman) for schema** — rejected as the primary knowledge source. Useful as a secondary verification tool for humans, but not callable by the agent mid-session.

## References

- Shopify Dev MCP announcement and install guide: `https://shopify.dev/docs/apps/build/ai-tools/dev-mcp` (queried via MCP itself on Day 1 before this ADR was written)
- Day 1 Phase D commits: `f9b4491` install + config; `.mcp.json` in repo root
- Per-session MCP usage log: `docs/AI-WORKFLOW.md`
- Upstream package: `@shopify/dev-mcp@1.12.0` (npm, Shopify-published, MIT)
