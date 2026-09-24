# Source publication and theme release

Source publication, a development upload and a live Shopify publication are different operations. This guide keeps the tested artifact, its authorization and the remote target explicit.

## Current repository boundary

The publication candidate replaces automatic dev/staging/production workflow writes with manual fail-closed verification. Credentialed browser workflows are manual; offline source/security checks can run on public-repository standard GitHub-hosted runners. The latter runner class is free under [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions); larger runners, optional paid services and retained external artifacts require separate cost review.

Before this PR/release, native GitHub inventory found `main` required one approving review and linear history, with no named required status contexts. The `production` environment had no protection rules, and the remote production workflow could write the live theme on a push to `main`. A YAML comment claiming reviewers exist was not enforcement. The local replacement must be reviewed and merged before anyone relies on it as the default-branch policy.

Publish the candidate on a feature branch and open a pull request. Do not bypass the required reviewer, use an admin override, force-push or weaken branch protection. A pushed feature branch/PR is available to clients and reviewers but does not update `main` or publish the Shopify theme. Verify the actual remote state after every authorized transition. Current hosted evidence belongs in [TESTING.md](TESTING.md).

## Public source checklist

1. Read native repository/branch/workflow settings and compare the remote base with local history. Fetch/reconcile changes without overwriting local work.
2. Inspect the intended file list. Exclude credentials, environment values, private dossier/memory, client documents/PDFs, browser artifacts and local connection settings. Ignore rules do not untrack an already tracked file.
3. Inspect the full proposed source and history with secret scanning; check configuration ownership, media provenance, truthful demo claims and documentation links. Resolve findings without disabling hooks.
4. Run applicable security/configuration tests, syntax, Theme Check, static analysis and independent review. Reuse unchanged artifact evidence explicitly; rerun behavior when code changes warrant it.
5. Stage a reviewed allowlist, inspect staged diff and scan staged content. Commit with a concrete summary, then push without force. Confirm local commit equals the remote branch commit and no private path entered the tree.
6. Open the pull request with tests, current behavior, remaining gates and the separation from live publication. Observe actual hosted checks; do not call missing or skipped gates green.

## Development and live theme delivery

Before a theme write, use native Shopify inventory to confirm the actual store, theme ID and role. Preserve a complete downloaded baseline and compare the affected files to local. If remote changed independently, reconcile locally first. Do not deploy from an actively edited worktree.

Freeze only reviewed files into an immutable artifact with path/SHA-256 manifest. Capture local gates and independent review. Immediately before upload, confirm role and baseline again. Upload the approved paths without deleting unrelated files; never include credentials or private tools.

Check both process exit status and Shopify's structured upload errors. This project observed an exit-zero response containing rejected files; success cannot be inferred from the exit code alone. Download the delivered files and require exact hashes, then exercise the real development content, market, cart, consent and navigation paths.

The private Phase2delivery helper performed these steps for the current accepted artifact. It is not a portable public deployment product: reusable reviewed-artifact/drift/recovery automation remains a future milestone. Accordingly the checked-in deploy workflows fail closed before theme writes.

Live publication needs a separate explicit decision for a concrete tested theme. GitHub merge does not authorize theme publication. Confirm payment/demo settings, product/legal/content readiness, monitoring, incident owner and rollback artifact first.

## Interrupted work and rollback

Record intended action, target, baseline, reviewed hashes and stage before a mutation. If power or transport fails after a write starts, read the actual remote state and reconcile the result; never blindly replay DNS, cart, order or deploy operations. Keep the previous working artifact and evidence.

A theme rollback restores reviewed theme files; it does not roll back orders, customer records, payments or external vendor changes. Test a rollback in an unpublished preview, compare exact hashes and exercise real behavior before any authorized live action. [Operations](OPERATIONS.md) defines future recovery targets and rehearsal criteria.

## Optional and legacy components

The checkout extension is unsupported reference source with an API mismatch; it is excluded from accepted root build/browser claims and must not be deployed from this workflow. The retired Worker has no active commerce role. Percy, paid AI review, external load tests and additional monitoring services are not required for this free publication.

## Observed source publication

On 2026-09-24, [PR #8](https://github.com/Zahidulislam2222/kindred-grove/pull/8) at source commit `078aae7` passed hosted [Security and config regression](https://github.com/Zahidulislam2222/kindred-grove/actions/runs/35937547220) and [Liquid linting](https://github.com/Zahidulislam2222/kindred-grove/actions/runs/35937547177). Main still requires one approving review; no status contexts are configured as required. Gitleaks remains disabled by inactivity remotely, with source/history/staged scans performed locally. No hosted browser or deployment run was invoked. The candidate is pushed on `feat/grove-journey-preview`; it is not merged or live-published.
