# Kindred Grove — 10-Phase Build Plan

**Revision 2 · 2026-09-24. Phase 2 complete for development; public documentation and GitHub handoff authorized.**

Phases are complete delivery milestones. Closely coupled configuration, security, privacy, demo content and storefront behavior are built together in Phase 2, using parallel bounded tasks and one integration gate. They are not five separate active phases. Root owns architecture, integration, monitoring and review; Luna implements assigned work. Prepared work for later milestones is retained without claiming those phases are complete.

**Approved domain:** `kindred-grove.zahidul-islam.com`. **Cost boundary:** free/local tools and existing verified entitlements only. No paid service, upgrade, card-required signup, paid generation, live purchase or public load test. The redesign remains unpublished; the custom domain currently serves the existing live theme.

## Delivery tracker

| Phase | Complete deliverable | Status |
|---:|---|---|
| 1 | Connected Shopify subdomain and verified service boundary | Verified for existing live theme |
| 2 | Safe, functional demo storefront | **Complete for development** — criteria 6/6; publication/documentation handoff follows |
| 3 | USA/EU applicability, content and data-governance evidence | **Not started**; earlier research prepared; merchant launch facts unresolved |
| 4 | Measured performance and media delivery | Budgets and risks documented; measurement pending |
| 5 | Capacity model and scaling design | Local model/harness prepared and tested; not Shopify capacity |
| 6 | Availability measurement and error-budget tools | 99% target/runbook prepared; measurement implementation pending |
| 7 | Rehearsed release recovery and power-loss continuity | Checkpoints active; timed recovery rehearsal pending |
| 8 | Reproducible CI and reviewed-artifact delivery | Two hosted source checks passed on PR8; enforcement and portable release gate pending |
| 9 | Independent integrated release audit | Pending stable artifact |
| 10 | Reviewable release and maintained handoff | Pending prior gates; no automatic live publication |

## Rules shared by every phase

- Write acceptance criteria before implementation. Assign nonoverlapping file ownership; coordinate shared layout/config changes. Parallel work stays inside a delivery milestone where possible. Do not run a release gate against files another agent is actively rewriting; freeze the reviewed artifact first.
- Preserve existing user changes. Before deployment: native theme inventory → remote snapshot → drift comparison/reconciliation → local gates → independent review → target-role check → reviewed upload → pull/hash parity → real behavior verification. Never infer publication from a theme name.
- Secrets remain in approved storage and ignored recovery files. Public docs contain no credential values, private identifiers or investigation records. Private files must be ignored and untracked before sensitive writes.
- Keep merchant content/settings native; validate configuration once per runtime. Same-origin requests, safe contextual output, bounded reads, explicit consent and no automatically retried cart writes are shared architecture requirements.
- Tests, syntax/type/lint/build checks, security scans and real browser checks have separate evidence. Missing or skipped checks are not passes. Independent review must come from a context that did not author the diff. Keep the installed scan hook active.
- Record before state, intended mutation, result, exact deployed hashes, failures and next action in the private project checkpoint. Update the dossier before derived public facts. Preserve append-only incident stories and test tooling. Google Docs and `my-project-view/` remain untouched without the separate explicit request.
- No unsupported claims of every-law compliance, complete security, million-user capacity, measured uptime or production readiness. Complete the controllable demo requirements; record merchant/platform dependencies explicitly rather than inventing facts.

## Phase 1 — Connected subdomain and service boundary

**Outcome:** the approved subdomain reaches the intended Shopify store over valid TLS without disturbing the portfolio domain.

**Parallel tasks / owners:** Luna prepares inventory and isolated route checks; root verifies native DNS/Shopify state, performs the authorized connection and reviews evidence.

**Deliverables:** before/after DNS inventory, DNS-only CNAME to `shops.myshopify.com`, Shopify Connected/Primary/TLS state, actual live/development theme roles, isolated product/cart/checkout-navigation checks and rollback instructions. Follow [Shopify's subdomain instructions](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-subdomain).

**Acceptance:** existing DNS rows preserved; portfolio root still available; intended store/domain/TLS verified; real product content and fresh-cart add/read/clear work; checkout navigation is genuine and submits no customer/payment data or order. A password-page HTTP 200 is not shopping-flow evidence.

**Evidence:** existing Free Cloudflare zone received one DNS-only CNAME; all eight previous records matched. Native Shopify admin confirmed Connected, Primary and TLS provisioned. Portfolio root returned 200. An isolated US session verified product content/API, empty cart → one item → checkout navigation HTTP 200 → cleared cart. No purchase, theme publication or paid resource occurred. Wrangler OAuth was checked first; it allowed zone inventory but DNS access returned 403. The signed-in dashboard completed the already-authorized DNS action without buying access.

**Root gate / status:** verified for the existing live theme. Redesign verification is separate. Rollback restores the previous Shopify primary domain and removes only this task's unchanged CNAME, preserving unrelated records. Dev-store password restrictions remain intact; see [Shopify dev-store capabilities](https://shopify.dev/docs/storefronts/themes/tools/development-stores).

## Phase 2 — Safe, functional demo storefront

**Outcome:** one integrated demo that visitors can navigate and shop experimentally, with truthful content, controlled data handling and secure browser behavior.

**Parallel workstreams:**

| Workstream | Luna implementation scope | Root integration/review |
|---|---|---|
| Configuration and tooling | Validated Node/browser settings, safe environment template, scanner coverage, trusted preview/password targets; retire unsafe unused writers | Configuration/secret audit and reproducible commands |
| Privacy and data handling | Native consent adapter, purpose-gated storage, withdrawal cleanup, memory-only quiz, disabled optional telemetry | Native banner settings, real accept/reject/withdrawal and network/storage checks |
| Demo and content controls | Default-on demo notice, inactive real signup/inquiry/checkout UI, sample labels, unsupported claims/schema suppression, native country/preferences controls | Truthful platform boundaries and actual rendered behavior |
| Storefront experience | Direction-aware header, synchronized hero copy/video, pause/reduced motion/failure behavior, keyboard/mobile interactions | Actual development browser tests and visual inspection |
| Requests and cart integrity | Safe URLs/output, locale-aware routes, bounded/cancelled reads, stale-response protection, serialized user mutations, unknown-outcome cart reconciliation | Hostile-input and failure tests plus real native cart flows |

These tasks share layout, settings and browser behavior, so they merge into one reviewed artifact and one phase acceptance record. File ownership remains explicit to prevent overlapping edits.

**Deliverables:** working theme code, native settings, maintained locales/data, regression tests, privacy/security/configuration docs and a checked development artifact. The former public Admin-API wholesale proxy stays retired. No real contact/newsletter messages or purchases are sent to demonstrate forms. Native Shopify/app processing outside the theme is disclosed separately.

**Acceptance:**

1. One validated owner for changeable configuration; real secrets absent from inspected shipping source/staging/history; private recovery paths ignored. Legacy tools cannot silently publish or activate products.
2. Optional theme processing denies by default, honors GPC/DNT, and responds to actual consent withdrawal. Quiz answers do not persist or enter telemetry. Native cart behavior remains usable.
3. Demo notices are visible; real PII submission and theme checkout controls are disabled in demo mode. Unsupported reviews, origin/certification claims and sample promotional structured data do not masquerade as verified facts. Platform-hosted account/checkout surfaces are explicitly outside theme control.
4. Header hides down/reveals up and on focus/menu/modal use; video/copy synchronize; pause, reduced motion and failed media preserve a usable storefront. Desktop/mobile, keyboard and no-JavaScript paths are exercised where supported.
5. Dynamic URLs and attributes are validated/escaped. Optional reads time out/cancel safely; stale responses cannot overwrite current UI. Cart writes do not automatically retry; unknown outcomes are reconciled and communicated truthfully.
6. Local tests/scans/Theme Check and independent review pass for the frozen artifact; development upload has exact pulled hash parity; actual product/cart/privacy/UX flows pass. Missing type/lint/build tooling is reported explicitly.

**Final evidence — 2026-09-24:** criteria **6/6 met for the reviewed development artifact**; independent scoped review accepted. Integrated browser suite **41 passed, 0 failed, 5 skipped, 0 flaky**. Local security/configuration suite **95/95**. Separate actual alternate Quiz/Wholesale functional checks **2/2** and active accessibility checks **2/2**, zero axe violations; the four base axe routes also passed. Cart **0→1→2→0**, actual native consent choices/withdrawal/reload, emulated GPC/DNT, direction-aware header, synchronized video/copy, keyboard/focus, reduced motion, no-JavaScript navigation at 320/390 px and product reflow at five widths passed. All **150/150 local, frozen-artifact and downloaded development files** have identical hashes.

**Gate results:** Theme Check 0 errors/2 existing orphan-snippet warnings; JavaScript syntax passed; Gitleaks, Semgrep and installed edit-hook checks passed in recorded source scopes. No standalone type-check, JS/CSS lint or bundler-build scripts are present; Bandit is not applicable to the shipping JS/CSS/Liquid files. These missing/inapplicable gates are not counted as passes.

**Limits retained:** five skips cover a single-variant product, absent canonical Quiz/Wholesale pages, no blog article and a Shopify-hosted account redirect. Alternate-template checks do not create those resources; Quiz used an explicit feature override after native Accept. Native banner configuration covers all 299 region entries, but Network Intelligence remains enabled and app/platform processing is outside theme proof. Full manual accessibility, legal applicability, continuous uptime and platform capacity are not established by this phase.

**Root gate / stop:** accepted for development, with the boundaries above. Subsequent authorization covers publishing reviewed code and comprehensive current/future documentation, followed by updating the existing client Google Doc/PDF. Later engineering milestones remain gated; documentation preparation does not mark their implementation complete. The redesign remains unpublished. No order, paid service, commit or repository push occurred in this phase closure.

## Phase 3 — USA/EU applicability and governance evidence

**Outcome:** a client-reviewable record linking actual demo controls and commercial launch prerequisites to applicable official sources.

**Luna tasks:** maintain content/data inventories, trace requirement IDs to tested controls, prepare merchant-fact and rights/retention/incident checklists. Root researches applicability and reviews every public claim.

**Deliverables:** [COMPLIANCE-RESEARCH.md](docs/COMPLIANCE-RESEARCH.md), actual privacy/vendor/data map, media provenance, SKU/market information requirements, pricing/discount and returns/withdrawal requirements, accessibility evidence, tax/import/food-label triggers, rights-request and breach-response procedures. Research covers GDPR/ePrivacy, applicable US state privacy/GPC/health-data rules, COPPA/CAN-SPAM, consumer contracts/reviews/advertising, food information, accessibility and media/IP/AI-transparency triggers.

**Acceptance:** each requirement has jurisdiction/trigger, official source and checked date, applicability decision or missing fact, control owner, actual evidence and next review date. No invented entity/address, certification, nutrition, tax rate, shipment promise or licensing claim. Commercial requirements that need real merchant facts remain explicit launch gates; the demo does not enable unresolved real commerce.

**Root gate:** verify the matrix against Phase 2's actual requests/storage/content and native markets. Current markets are US and Canada; EU commercial rollout is not established. Legal/tax interpretation requiring professional review stays a dependency, not a paid service commissioned by this plan.

## Phase 4 — Measured performance and media delivery

**Outcome:** reproducible desktop/mobile measurements and justified optimizations that preserve the experience.

**Luna tasks:** collect local/free lab evidence, inspect image/video/CSS/script cost and implement reviewed optimizations. Root defines profiles/budgets and visually reviews tradeoffs.

**Deliverables:** current Lighthouse/trace/waterfall evidence, cold/warm profiles, transferred bytes, poster/first-frame behavior and failure tests; revised [PERFORMANCE.md](docs/PERFORMANCE.md). Compare native hosted range playback against the current full-blob film approach before changing it. No paid media generation or unlicensed replacement.

**Acceptance:** real storefront content measured under recorded route/market/consent/device/cache conditions; agreed budgets met or explicit unresolved release blockers recorded. Keyboard, reduced motion, visual quality and cart behavior do not regress. A fast password page is invalid evidence.

**Root gate:** inspect actual before/after reports and visuals; do not infer field INP or concurrency from a Lighthouse score. Current 5.5 MiB journey asset is an acknowledged measurement/optimization concern.

## Phase 5 — Capacity model and scaling design

**Outcome:** developers can reproduce workload projections and understand what must change or be verified at 10k, 100k and 1M concurrent visitors.

**Luna tasks:** validated scenario model, loopback-only mock harness, failure/overflow tests and exact observed local results. Root owns platform boundaries, assumptions and graduation gates.

**Deliverables:** [SCALABILITY.md](docs/SCALABILITY.md), `scripts/capacity/`, assumptions for page frequency/static requests/cache hits/cart writes/checkout starts/burst and media transfer, plus service ownership and future bottleneck decisions. Native Shopify/CDN/checkout remain distinct; no per-visitor Admin API or accidental public Worker fan-out.

**Acceptance:** concurrency and throughput are distinct; all projections are finite and labeled PROJECTED; local measurements say LOCAL_MOCK_NOT_SHOPIFY; local harness cannot target an external service and enforces request/concurrency/duration limits. Document platform entitlement/capacity evidence and authorized external tests needed for each scale level. No assertion that a free tier supports one million users.

**Root gate / prepared evidence:** local harness completed 1,000 requests with zero errors; focused tests passed, including overflow rejection after review. Validate final code independently. This is prepared local evidence, not a Shopify load test or closed capacity milestone.

## Phase 6 — Availability measurement and error budgets

**Outcome:** a usable definition and calculation of the proposed 99% availability objective.

**Luna tasks:** bounded privacy-safe probe/report tooling and SLI/error-budget calculations; root reviews success semantics and free monitoring options.

**Deliverables:** separate browsing/cart/checkout indicators, rolling 30-day window, coverage/missing-sample reporting, failure categories, owner/alert/runbook procedure and [OPERATIONS.md](docs/OPERATIONS.md). Use an independently available monitoring source only after its free entitlement and traffic limits are verified.

**Acceptance:** password/error/challenge pages do not count as successful shopping; dependency failures stay in the end-to-end result; missing samples are unknown. Continuous-time 99% over 30 days permits 432 minutes unavailable, distinct from a request-count budget. Local laptop checks do not establish continuous availability. No paid monitor or real customer purchase.

**Root gate:** exercise success/failure/missing-data cases and report actual coverage. Proposed SLO remains separate from an SLA and observed uptime.

## Phase 7 — Rehearsed recovery and interruption continuity

**Outcome:** another developer can safely resume after power loss or restore a known theme artifact after failure.

**Luna tasks:** portable checkpoint/manifest validation and rehearsal tooling; root executes authorized preview-only recovery and records timing.

**Deliverables:** current task index, before/after snapshots, reviewed artifact hashes, interrupted-stage detection, preview rollback/restore rehearsal and incident procedure. Proposed theme RTO ≤30 minutes and RPO of the last reviewed deployed revision; Shopify order/customer durability is a separate boundary.

**Acceptance:** simulated interruption never blindly replays DNS, form or cart mutations; remote drift is preserved/reconciled; restored files match exact hashes; real preview behavior works; measured elapsed recovery is reported against the target. No deletion of personal test tooling or customer/catalog reset.

**Root gate:** inspect a timed preview rehearsal and next-agent recovery record. Existing checkpoints are active, but the timed rehearsal remains pending.

## Phase 8 — Reproducible CI and reviewed-artifact delivery

**Outcome:** GitHub readers can see a reproducible free validation/release path with explicit trust boundaries.

**Luna tasks:** pinned actions/toolchain, locked installs, scanner/config regressions, safe preview lifecycle and portable artifact/drift/parity gate. Root independently verifies official versions/checksums and actual native repository settings.

**Deliverables:** local/CI commands, meaningful required-check proposal, environment prerequisites, reviewed-file manifest and safe deployment/rollback mechanism. No secrets in arguments, URLs, reports or recordings. No paid review engine or mandatory Percy service.

**Acceptance:** missing configuration fails clearly; untrusted preview output cannot redirect password submission; no automatic live writes; reviewed artifact cannot change after checks; remote drift or hash mismatch blocks release. Hosted workflow execution and branch enforcement are verified separately from local YAML. Check free public-repository eligibility and artifact limits before activation.

**Root gate:** current local action pins and tool versions were verified against official sources, and PR8/source078aae7 passed hosted security/configuration and Liquid checks. Main requires one approving review but has no required-status contexts; no protection settings were changed. Release workflows remain fail-closed until delivery automation is complete and tested. [GitHub Actions billing boundaries](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Phase 9 — Independent integrated release audit

**Outcome:** one stable candidate has a complete, honest evidence record across all delivered controls.

**Luna tasks:** reproduce failures, resolve bounded findings, gather browser/scan/accessibility evidence; an independent reviewer checks the diff against criteria. Root controls the artifact and integrates fixes.

**Deliverables:** full test/scan/Theme Check results, available type/lint/build gates, actual mobile/desktop/keyboard/privacy/cart/market checks, manual accessibility limitations, source/config/secret audit, documentation consistency and defect log.

**Acceptance:** every mandatory case has a result; no guessed bot-protection skip hides a cart failure; no local asset override is mistaken for deployed behavior. All fixes trigger relevant reruns, and final deployment parity matches the tested artifact. Missing checks and merchant/platform dependencies are explicit.

**Root gate:** reviewer verdict, criteria met/total, real flows exercised, each gate's result and unresolved risks. No broad production-readiness statement without this evidence.

## Phase 10 — Reviewable release and maintained handoff

**Outcome:** the user has a concrete reviewed result, accurate GitHub-facing docs and a reliable continuation record.

**Luna tasks:** finish derived public docs and reproducible commands; root reviews release scope, evidence and remaining decisions.

**Deliverables:** README/setup, architecture/security/privacy/compliance/performance/capacity/operations docs, final phase statuses, before→after evidence, known limits, free-service boundaries and rollback instructions. Private dossier/credentials/checkpoint remain complete and ignored; locked Google Docs/PDF outputs remain untouched.

**Acceptance:** documentation matches the exact candidate, links work, no private material leaks, and every capacity/compliance/uptime statement has its proper evidence level. The development candidate is usable and its source parity proven. Any live publication is a distinct concrete release decision; no unfinished redesign is silently published.

**Root gate:** report what is verified, what is not and why. If publication requires user approval, all authorized preparation must already be complete and reviewable before asking.

## Mapping from the earlier topic-based plan

Historical private checkpoints retain their original phase numbers. This mapping prevents lost work or false restarts:

| Earlier topic phase | New delivery milestone |
|---|---|
| 1 Domain | 1 |
| 2 Configuration, 3 Security, 4 Privacy, 5 Demo controls, 6 Header/UX, 7 Request resilience | 2, with formal applicability evidence in 3 |
| 5 Commercial legal/content research | 3 |
| 7 Performance | 4 |
| 8 Capacity | 5 |
| 9 Availability/recovery | 6 and 7 |
| 3/10 CI and release tooling | 8 |
| 10 Full verification/handoff | 9 and 10 |

The plan still has exactly ten phases and retains subdomain-first execution. Parallelism is inside complete deliveries; shared acceptance gates make progress easier to assess. See each phase's current evidence rather than interpreting prepared code as a completed milestone.
