# AI Governance — Kindred Grove

Last updated: 2026-04-19 (Day 21)

This document records how AI tooling is used on the Kindred Grove project, what it's allowed to touch, what it isn't, and how human judgment gates shipping.

The complementary doc, [`AI-WORKFLOW.md`](AI-WORKFLOW.md), is the running log of prompts, velocity impact, and session notes. Governance = rules. Workflow = what actually happened.

---

## 1. Tools in use

| Tool | Role | Access |
|---|---|---|
| Claude Code (Anthropic) | Primary engineering assistant. Writes Liquid, JS, CSS, docs, workflows. Runs bash/gh commands locally. | Full filesystem + local shell. Cannot access browser sessions, Shopify admin, Partners Dashboard, or any service outside the local machine + public APIs. |
| Shopify Dev MCP | Shopify-specific knowledge layer injected into the Claude editor. Provides up-to-date Liquid filter reference, GraphQL schema, theme-check rules. | Read-only against Shopify's public docs + schema. |
| Claude Design | Brand system generation (color tokens, type pair, spacing scale). Day 1 only; output committed to `assets/theme.css`. | N/A (used via UI, no shell access). |

No other AI tools are wired into the repo or workflow. No Copilot, no Cursor, no v0, no Magic. This is a single-assistant project by design — it keeps the AI-velocity story clean for the case study.

---

## 2. What Claude Code is allowed to do

- Read any file in the repository.
- Write or edit any file in the repository *except* the four gitignored confidential docs (`SOW.md`, `BRAND-BRIEF.md`, `BUILD-LOG.md`, `CI-SECRETS.md`) without explicit confirmation — those require user sign-off per commit.
- Run `shopify theme check`, `npm install`, `npm run test:*`, `git status`, `git diff`, `git log`, and any other read-only or local-only command.
- Run `git commit`, `git tag`, `git push` when the user has explicitly authorized the commit in the current session.
- Call the Admin API for the Kindred Grove dev store via `ADMIN_API_TOKEN` for documented purposes only (product seeding, reading theme assets, validating scope requirements).
- Call public Shopify APIs (Storefront API, Search API) from within theme JS it writes.

---

## 3. What Claude Code is NOT allowed to do without explicit user approval

- Merge a pull request.
- Push a `--force` or `--force-with-lease`.
- Delete a tag.
- Bypass branch-protection rules. (It can merge with `--admin` only when the user has explicitly said "merge it.")
- Change the scope of a GitHub secret, Shopify custom app, or any external service configuration.
- Send email, post to Slack, or use any outbound integration.
- Deploy to production. Production deploys are gated by a required-reviewer rule in the `production` GitHub environment — Claude cannot self-approve.
- Commit files that fail `shopify theme check` or introduce obvious regressions in CI.
- Add a new runtime dependency without a documented rationale (the theme ships unbundled by design).

When in doubt, Claude asks.

---

## 4. Human review boundary

Every AI-assisted diff is read by a human before it merges. Specifically:

- The **author** (Zahidul Islam, in this project) reads every commit's diff before `git push`.
- The **reviewer** (Zahidul Islam, self-review in this solo-developer context; a separate reviewer in future multi-person work) reads the PR diff before merge.
- For high-risk surfaces — security-sensitive code (`layout/theme.liquid` CSP, `scripts/wholesale-draft-order-worker.js`, any auth path), customer-data handling, payment flows — an additional read-through is mandatory.

No auto-merge on AI-authored PRs. Ever. Even when CI is green.

---

## 5. Commit trailer convention

Every commit that was AI-assisted ends with:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

"AI-assisted" here means Claude wrote any substantive portion of the diff — code, docs, commit message, or the plan that led to the change. Trivial one-line fixes that the human typed directly don't need the trailer.

---

## 6. Prompt logging

Non-trivial prompts (new block, new workflow, new ADR, cross-cutting refactor) are summarized in [`AI-WORKFLOW.md`](AI-WORKFLOW.md) with:

- The prompt's intent (one sentence).
- What Claude produced on first try.
- What the human corrected (if anything).
- Velocity estimate — "this would have taken ~Xh to write by hand."

The case-study narrative draws from this log. Vague "AI did everything" claims are not allowed — concrete before/after evidence is required.

---

## 7. Where AI is weakest (honest)

Recorded so Claude flags these up-front in future work and doesn't silently muddle through:

- **Shopify platform quirks that only a real store exercises.** Example from Day 10: headless-browser `/cart/add.js` 401 on password-protected dev stores. Claude didn't know this until the test failed in CI. The fix was a documented skip with a real-fix path forward.
- **Merchant-facing UX intuition.** A developer can write schema JSON that satisfies theme-check; whether a merchant understands the resulting editor is a separate skill. The Day 20 merchant walkthrough is where this gap closes.
- **Multi-commit coordination under time pressure.** Claude works best with clear task boundaries per commit. When we rush, patterns drift. The fix is explicit Task tracking (we use TaskCreate / TaskUpdate) and per-day tagging.
- **Anti-pattern detection in unfamiliar domains.** Claude knows Shopify better than most domains but not as well as a human who's been at it for 5 years. Explicit ADRs for every architectural choice are the hedge — no "it felt right" decisions.

---

## 8. Data handling

- No customer PII has been shared with Claude during this project. The seed script's email fields are fictional.
- No real OAuth tokens are persisted in chat history beyond the scope of provisioning them into CI secrets / local `.env`. Tokens that landed in chat (e.g. during the Day 10 secret-provisioning session) are flagged for rotation at project-end.
- Claude's model output is not logged to any external service beyond Anthropic's own training-data-exclusion-by-default policy for API usage. See Anthropic's [usage policies](https://www.anthropic.com/legal/usage-policy) and the project's Anthropic account settings for the enforcement status.

---

## 9. Escalation

If an AI-assisted change introduces a real bug that reaches production:

1. The human author owns the bug, not "Claude did it." The review gate (§4) is the human's responsibility.
2. Root-cause the miss: was it a prompt gap? A review gap? An area where the model is known weak (§7)?
3. Update the governance / workflow doc to prevent the class of miss. Example: adding the "dual-write secrets" feedback memory after the Day 10 session where secrets were saved to GH only and missed `.env`.

---

## 10. Portfolio honesty

The case-study site (Phase 1.5 deliverable) will document AI usage concretely:

- Actual prompts (redacted of confidential client detail).
- Actual velocity comparison (hand-coded Day 1 baseline vs. AI-assisted Days 2-21).
- Failure modes that surfaced and how they were handled.

No "AI built the whole thing in an afternoon" claims. The goal of this document and the AI-workflow log is to make the AI-assisted delivery reproducible — which means being honest about where the AI helped and where it hurt.
