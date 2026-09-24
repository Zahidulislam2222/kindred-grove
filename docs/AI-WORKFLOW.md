# AI-assisted engineering workflow

Kindred Grove uses an architecture/review agent and bounded implementation agents with explicit file ownership. The user requested Astra/root for planning and Luna for labor. The public value is the reviewable source, actual test evidence and maintained engineering decisions; model names do not replace those controls.

## Delivery loop

1. Read the current project state and rules, research platform behavior from primary documentation and write acceptance criteria.
2. Assign nonoverlapping work inside one delivery milestone; retain a single integration owner for shared files.
3. Implement against the configuration and security boundaries, with meaningful regressions for real risks.
4. Review independently, combine the artifact and run the applicable local and real-flow gates.
5. Inspect native remote state, preserve drift, deploy only within authorization and prove pulled parity.
6. Update the private master record before deriving public docs; keep recovery checkpoints current before and after mutations.

## Examples from this delivery

| Finding | Correction | Evidence |
|---|---|---|
| Native Shopify cart JSON used a legacy JavaScript MIME type | Allow bounded JSON parsing only on known native JSON routes; never execute the body | Provider-contract regressions plus actual cart0→1→2→0 without false errors |
| Quiz configuration selector and translated JSON escaping did not match actual markup | Component-local configuration lookup and context-specific escaping | Five-question/result/reload flow and active axe passed |
| Product sample-price label overflowed a narrow viewport | Demo-only wrapping at narrow widths after measuring the actual overflow | Reflow checks at320/370/371/390/1440px |
| Shopify CLI returned exit0 while reporting rejected files in JSON | Inspect structured errors and pull/hash every delivered file | Exact150/150local/artifact/developmentparity |

Detailed escaped defects are in [DEFECT-LOG.md](../DEFECT-LOG.md). The current accepted evidence is recorded in [TESTING.md](TESTING.md).

## Review and public claims

Independent AI review is recorded as such; it is not presented as a human audit or legal approval. Future performance, capacity, legal and availability work has explicit acceptance gates. No measured model-cost saving, productivity multiplier or account-usage percentage is claimed.

Historical prompts and account-specific session details are not part of the client/public deliverable. Prompt examples for new work should contain synthetic data only and should ask for acceptance criteria, failure handling, configuration ownership and observed verification rather than unqualified completion.

[Governance](AI_GOVERNANCE.md) defines authorization, private data, spending and release boundaries. [Contributing](../CONTRIBUTING.md) provides the executable workflow.
