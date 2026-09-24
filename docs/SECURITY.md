# Security — Kindred Grove

Reviewed 2026-09-24. This is an evidence register for a Shopify theme, not a security certification. [BUILD-PLAN.md](../BUILD-PLAN.md) records the release gates; [COMPLIANCE-RESEARCH.md](COMPLIANCE-RESEARCH.md) records applicability questions.

## Boundaries and current controls

| Boundary / threat | Control or decision | Evidence / remaining gate |
|---|---|---|
| Public wholesale input causing Admin API writes | Retire the proxy; retain native Shopify contact | Local Worker returns 410 without reading request/env or calling network. Three regression tests passed. Remote removal is not claimed. [ADR 009](adr/009-retire-wholesale-admin-proxy.md) |
| Accidental source secret disclosure | Default Gitleaks detectors; narrow root credential-file exclusions | Source snapshot and full Git-history scan returned zero findings on 2026-09-24; effective-coverage synthetic regression passed |
| Private recovery files entering Git | Ignored credential, environment, dossier and memory paths | Ignore/tracking/history checks passed for these paths; local copies remain sensitive |
| Test target/password misconfiguration | Validated Node test boundary; independently bound preview target; reject URL credentials and conflicting password aliases | Combined suite: 95/95 local tests, including page/form/submitter origin and POST checks and the corrected quiz transport. Actual cart cycle and native consent controls passed; final integrated browser gate passed 41 cases with zero failures and five documented skips. Password-entry artifacts are disabled |
| Inline merchant JSON breaking HTML/script context | Replace raw script interpolation with context-safe data transport | Escaped template configuration and hostile-delimiter tests passed source review; actual Quiz rendering, five-question flow, result navigation and reload passed on the alternate template |
| Optional tracking/storage before consent | Native privacy API and fail-closed theme processing; retire automatic telemetry loading | Native banner all 299 region entries configured and persisted; actual choices/withdrawal/reload passed, plus two explicit GPC/DNT emulation checks. Platform/app processing is separate |
| API-derived URLs and HTML attributes | Scheme/origin validation, context escaping or safe DOM APIs | Bounded URL/response tests and independent source review passed; no blanket XSS mitigation claim |
| Supply-chain / CI trust | Locked installs, pinned tools/actions, explicit missing-prerequisite failures | Pinned workflow/tool configuration; hosted security/configuration and Liquid checks passed on PR8/source078aae7; required-status enforcement remains unconfigured |
| Theme overwrite or stale deployment | Remote snapshot, local reconciliation, unpublished verification, pull-back hash parity | Exact 150/150 local/frozen/downloaded development hashes; baseline snapshots retained; no live redesign publication |
| Credential/access abuse | Least privilege, protected credentials, review of active integrations | Existing credential scope and platform-role audit remains incomplete; MFA is a merchant/account responsibility |

The earlier historical document described broad risks as “mitigated” without current evidence. Those claims are withdrawn. In particular, a browser honeypot/timer is not server-side rate limiting, encryption does not eliminate credential risk, and a successful HTTP response does not establish a successful business operation.

## Native form boundary

Wholesale remains a Shopify Liquid contact form with its native validation and platform-owned protections. The optional browser cooldown is disabled by default, in memory only, and a UX aid. Errors render as text; the theme does not fabricate a queued/success response or forward an inquiry to a second service. No real inquiry email was sent during local verification.

Shopify documents [contact forms](https://shopify.dev/docs/storefronts/themes/customer-engagement/add-contact-form) and [storefront CAPTCHA](https://shopify.dev/docs/storefronts/themes/trust-security/captcha). The presence of a Liquid form is not proof that every platform anti-abuse setting was exercised. Do not bypass challenges in tests. Any future backend needs reviewed authentication/authorization, bounded parsing, admission control, idempotency and cost/capacity limits before exposure.

## Output and browser security

Escaping must match the destination: HTML text, attribute, URL, script data and rich content are different contexts. `json` serialization alone is not proof that an HTML script closing delimiter is safe. `strip_html` is not a universal sanitizer. Merchant-authored content can still cross a security boundary when apps, imports or compromised accounts supply it.

Review dynamic URL sinks, not just visible titles. Product/media URLs need accepted schemes and appropriate origins before insertion; escape attribute delimiters where string-built HTML remains. Request cancellation and response validation also protect against stale or malformed results. The reviewed Phase 2 source passed its scoped transport/output regressions and independent review; a later integrated release audit must include any subsequent changes.

The layout has a meta CSP. Its source is authoritative; do not copy a stale directive list into this document. It currently permits inline scripts and broad Shopify hosts for platform compatibility. It is defense in depth, not a complete XSS defense. A theme cannot use a meta tag to configure every response-header control; for example, frame-ancestor protection needs the serving platform. Verify compatibility against the actual custom domain, checkout, media and consent flows before narrowing directives. [MDN CSP guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP).

## Secrets and scan coverage

Never put Admin API credentials into Liquid, assets, tests, fixtures, logs, command arguments or public documentation. CLI consumers use environment variables; public `.env.example` values are placeholders only. Privileged tokens do not belong in browser configuration. A public integration identifier is not a private API key, but still needs accurate purpose and vendor documentation.

`.gitleaks.toml` inherits default rules and excludes only exact root credential paths. The regression fixture proves shipping scripts, docs, tests and `.env.example` remain scanned, including nested files that resemble private root names. Upstream Gitleaks 8.30.1 still excludes dependency lockfiles and binary files; inherited exclusions are a documented limitation, not a scanned-clean claim for those files. The installed edit hook and independent scans complement code review; neither establishes absence of all vulnerabilities.

Private credential/recovery paths were ignored, untracked and absent from the inspected Git history. A local recovery file remains sensitive to device compromise and backups. Do not paste it into issues, test reports or support requests. If a real credential leak is found, rotate the credential first, then assess history/artifact cleanup and affected access; deleting a file alone does not revoke a token.

## CI and release trust

The repository is public. Native inventory found the Gitleaks workflow disabled by inactivity and `main` with an empty required-status list. Checked-in workflows and a branch-protection sample do not prove hosted enforcement. Record any later native change separately.

Never use green skipped jobs as release evidence. Missing credentials are a blocked/failed prerequisite. Do not expose secrets to untrusted pull-request code or use `pull_request_target` to execute it. Pin action references to verified commits and install the locked test harness. Percy or paid AI review is not part of the required free gate.

A release needs the tested revision, intended actual theme role, remote drift check and post-upload parity. The existence of a GitHub Environment name does not prove required reviewers are configured. Never claim a production deployment is approval-protected without querying the actual configuration.

## Privacy, data and observability

Shopify remains a processor/platform dependency. Native privacy policy and opt-out configuration were observed, and the cookie banner was configured worldwide. Shopify Network Intelligence remains enabled; its disable flow would uninstall Shop, so it was cancelled. This theme cannot claim platform-wide absence of analytics or sharing.

Theme-owned optional tracking must fail closed without the relevant permission. Diagnostic payloads must not include shopper fields, arbitrary exceptions containing form data, URLs with identifiers, cart tokens or raw upstream responses. Browser tests must not persist password entry or live customer data in artifacts. Merchant identity, retention, rights requests, processors and actual regional obligations still require documented business facts.

## Reporting and response

Use the repository's private vulnerability reporting channel only if the repository owner has enabled it; otherwise obtain a verified private contact from the maintainer. No security mailbox or response SLA has been verified, so this document does not invent one. Do not post an exploit, customer data or credentials in a public issue.

Record escaped defects in `DEFECT-LOG.md`, preserve a redacted reproduction and add the missing gate. Incident detail and recovery access belong in private project records. See [OPERATIONS.md](OPERATIONS.md).
