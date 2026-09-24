# Availability, incident response and recovery

Status: 99% is a proposed per-path service objective. Continuous monitoring, an accountable on-call rotation, and recovery rehearsal are not yet implemented or verified. Reviewed 2026-09-24.

This runbook describes future operating practice for the Shopify storefront. Shopify hosts core theme rendering, cart and checkout services; the merchant owns store configuration, commerce operations and provider relationships. The theme team can observe and reduce client-side failures, but cannot promise or directly repair Shopify platform availability. This document is not an SLA, staffed support commitment or claim of measured uptime.

## Proposed service objective and indicators

Adopt a 99% good-event target over a rolling 30-day window separately for browsing, cart and checkout navigation after the merchant names an accountable owner and approves measurement coverage. Google SRE recommends defining an SLI as good events divided by eligible total events, then using the resulting error budget to make operational decisions. Missing telemetry is unknown, not a good event. [Google SRE Workbook: implementing SLOs](https://sre.google/workbook/implementing-slos/).

| Path SLI | A good event means | Failure examples |
|---|---|---|
| Browsing | An eligible observation reaches the intended storefront over valid TLS, renders actual page/product content for the requested market, and the browser can use primary navigation. A 200 response alone is insufficient. | Wrong theme/market, password/challenge/error HTML, blank or unusable product content, TLS failure, navigation failure, timeout. |
| Cart | An isolated, empty test context can add one known available test variant, read the expected item/quantity, and clear that same cart without duplicate mutation. | Add not persisted, wrong quantity, ambiguous result not reconciled, remove/clear failure, wrong storefront or market. |
| Checkout navigation | A cart with a test item can navigate to a genuine Shopify-hosted checkout without submitting customer or payment data or placing an order. This measures navigation only, not payment authorization or completed purchases. | Dead end, invalid checkout route, error/challenge page, navigation timeout. |

Calculate event SLI as `good eligible observations / all eligible observations`. Keep an end-to-end view that includes Shopify and other dependencies; add separately attributed theme/platform/provider breakdowns for diagnosis rather than excluding dependency errors. Report the event denominator, sample schedule, actual received count and missing count. Use a separate latency SLI such as “good requests completing within a reviewed threshold / eligible requests”; do not silently mix latency targets into availability after collection starts.

At 99% continuous-time availability over 30 days, the illustrative time allowance is 432 minutes (7 hours 12 minutes). A request/event error budget is separately `eligible events × 1%`; do not translate failed probe counts into downtime without matching the measurement model. A 99% objective is a target only after the merchant approves it. It is not observed performance or a promise of uptime.

## Monitoring design and alert policy

No continuous, independent monitoring service is active under this project. The private domain audit is on-demand and can be interrupted with its host. Before enabling a monitor, verify its current free entitlement, request limits, region, retention, privacy behavior and any cost; do not add a paid service or schedule mutation probes by assumption. Shopify's own performance dashboard and status information can provide platform context, but do not replace a real shopper-path SLI. Use browser synthetic lab checks for known routes and optional privacy-approved field performance only after consent and data processing are reviewed. Shopify recommends combining appropriate field/lab performance evidence; theme performance metrics include TTFB, LCP, CLS and INP. [Shopify performance guidance](https://shopify.dev/docs/storefronts/themes/best-practices/performance/index).

Record only timestamp, region, tested theme role/revision, market, path indicator, duration, result and a coarse failure category. Exclude passwords, cookies, cart tokens, customer fields, full checkout/session URLs and raw provider bodies. Monitoring configuration (probe frequency, timeout, alert thresholds and sample minimums) must have one centrally maintained owner when implemented; do not scatter values through probe code.

Proposed initial alert policy, pending named on-call owner and traffic-volume review:

- Fast-burn page: any path's event-based error budget burn exceeds 14.4× over both 1-hour and 6-hour windows, provided each window meets its minimum sample count. This indicates rapid budget consumption, not necessarily a platform outage.
- Sustained-burn ticket: burn exceeds 6× across 6-hour and 3-day windows, with adequate sample volume.
- Coverage alert: scheduled observations are missing for a whole region/window or below the agreed coverage floor; show status as unknown rather than green.
- Direct incident trigger: checkout navigation, cart mutation correctness, data exposure or TLS for the intended domain is materially broken even if a low-traffic ratio has not crossed an alert threshold.

These are proposed starting thresholds, not deployed settings. Low-volume probes can make one failure appear statistically dramatic; require a volume floor and combine with a real symptom review. The merchant/platform operator must assign alert recipients and response hours before turning a notification channel on. Google SRE describes multi-window, multi-burn-rate alerting and cautions that low traffic needs different interpretation. [Google SRE Workbook: alerting on SLOs](https://sre.google/workbook/alerting-on-slos/).

## Roles and incident response

Before production operation, record named primary and backup incident owners, merchant escalation/contact method, platform/vendor status links, change authority and staffed response hours. None are inferred here. A small team without 24/7 coverage must say so and choose an objective/monitoring approach it can actually support.

During an incident:

1. **Declare and bound.** Record UTC start, affected path/market/region, customer impact, current revision and confidence. Use sanitized screenshots/headers and coarse errors only. Avoid collecting customer records while diagnosing.
2. **Protect shoppers.** Stop nonessential release activity and campaign changes. If a theme change plausibly caused the issue, disable the affected optional feature through an already-reviewed setting or prepare a verified theme rollback. Do not “fix” a commerce outage by editing catalog, customer, payment or DNS data without an authorized separate procedure.
3. **Separate dependencies.** Check the Shopify status and admin/storefront state, current market/catalog availability, domain/TLS, theme and app changes, and configured payment/shipping providers. Keep the failed end-to-end event counted; record probable attribution separately.
4. **Recover safely.** Compare the deployed theme to its reviewed local release manifest. Restore only a known-good theme artifact through the reviewed release path. Do not publish an untested local edit during the incident. For cart uncertainty, inspect the isolated/current cart state before any retry; do not replay writes blindly.
5. **Verify.** Recheck the same route, market and browser path. For cart, use a fresh isolated test context, verify exact add/read/clear, and ensure its test cart is empty afterward. Checkout verification stops at navigation and submits no personal/payment data.
6. **Communicate and learn.** The merchant owns customer-facing updates and legal escalation. Record impact interval, indicators and coverage, change/failure timeline, decisions, recovery proof, data-handling assessment and follow-up actions. Add escaped defects to the defect log and regression gates; publish only scrubbed engineering notes.

For suspected personal-data exposure, contain access, preserve only minimal access-controlled evidence, and notify the merchant/controller promptly through the agreed private channel. The controller and counsel assess affected data, people, processors and jurisdictions, including applicable authority and individual notice duties. A code rollback does not complete breach assessment or notification. The current privacy document lists unverified merchant/platform obligations; see [PRIVACY.md](PRIVACY.md) and [COMPLIANCE-RESEARCH.md](COMPLIANCE-RESEARCH.md). No regulator or customer notification is automated by this theme.

## Backups, recovery targets and power loss

Keep separate recovery boundaries:

| Asset/state | Recovery source | Target / limitation |
|---|---|---|
| Theme source | Version-controlled reviewed source plus release commit/hash manifest; keep the previous known-good release identifiable. | Proposed theme RPO: last reviewed artifact. Recovery restores theme code only. |
| Deployed theme files | Before-write remote inventory and downloaded snapshot; compare against local, reconcile drift, then upload only reviewed files. Pull after upload and compare exact hashes. | Proposed rollback RTO: 30 minutes, not yet rehearsed. Measure it during a preview-only recovery exercise before claiming it. |
| Theme configuration | Snapshot relevant theme settings data and record changed native settings before each approved release. Store secrets separately in approved ignored recovery storage. | Restore only known reviewed settings. Never copy secret values into public docs, screenshots, logs or reports. |
| Products, orders, customers, payment records | Shopify/admin-owned records and the merchant's verified platform backup/export process. | Outside theme backup/RPO/RTO. Do not treat a theme snapshot as a catalog or customer-data backup. Confirm export, retention and restoration procedure with the merchant/platform. |
| Domain and market settings | Before/after inventory and approved change record. | Do not alter unrelated DNS, market, payment or account configuration as part of theme recovery. |

Before any remote write: verify intended store and theme role; inventory native state; download the exact before snapshot; compare with local; stop if remote has unexplained newer changes; complete local tests/review; record explicit file selection. After write: pull the changed set to a separate directory, compare byte/hash parity and exercise the actual development browser flow. A name or URL containing “dev” is not proof of unpublished role. Shopify CLI supports development themes for preview/testing; use the documented path and verify the target identity. [Shopify CLI theme development](https://shopify.dev/docs/storefronts/themes/tools/cli).

Power-loss checkpoint records belong in the project's ignored `memory/` area: current phase, exact owned files, baseline snapshots, command/result evidence, remote writes (if any), unresolved gates and next safe action. After restart, inspect that checkpoint, current Git state and remote state before repeating an operation. A missing result is not evidence that a write failed; check first. Never replay a domain mutation, cart write, form submission or deployment blindly.

## Release, rollback and recovery rehearsal

Use this release sequence:

1. Freeze the candidate; capture source revision and hashes.
2. Read current Shopify store/theme inventory and pull a separate remote snapshot.
3. Compare all in-scope files; reconcile unexplained remote-ahead edits before authoring or deployment.
4. Run local tests, scanner/security gates and Theme Check; record absent tooling explicitly.
5. Have a reviewer who did not author the candidate inspect the exact diff and acceptance evidence.
6. Confirm destination store, role and permissions; upload only the selected candidate files to an unpublished/development theme.
7. Pull and compare downloaded hashes; run the real browser regression against that exact target.
8. Treat production publication as a separate release decision with merchant authorization, communications, rollback identity and owner. This task's scope does not authorize publication.

Rehearse restoration on an unpublished theme: select the previous reviewed manifest, restore its files/settings, compare downloaded hashes, and rerun theme/cart/privacy/navigation smoke checks. Time the exercise from recovery declaration to verified restored behavior; compare with the proposed ≤30-minute target and update it honestly. Do not test data restoration by deleting, resetting or mutating live catalog, customer or order records.

## Known failure handling

| Failure | Immediate behavior | Recovery evidence |
|---|---|---|
| Hero image/video unavailable | Keep poster, text, product links and reduced-motion/static presentation usable. | Browser test confirms content and shopping links remain available. |
| Native privacy API unavailable | Deny theme-owned optional processing; preserve core storefront operation. | Test denial and no owned optional storage/network activity. |
| Cart mutation times out | Do not automatically repeat an uncertain write; read state and communicate the observed result. | Exact count and line state after reconciliation; no duplicate item. |
| Shopify/provider throttles | Honor returned state, bound/cancel reads, avoid retry bursts; keep affected SLI failures counted. | Status/headers category, retry behavior and recovery window without logging raw shopper response. |
| Remote theme drift | Stop the write, preserve snapshot and reconcile into local source. | Before/after file list and exact hashes. |
| Error budget drains rapidly | Freeze nonessential changes; prioritize dependency diagnosis and proven restoration. | SLI window, burn calculation, affected routes and post-recovery checks. |

Related operating evidence is tracked in [BUILD-PLAN.md](../BUILD-PLAN.md). Current targets and procedures are proposals until the owner, monitoring implementation and rehearsal are recorded.
