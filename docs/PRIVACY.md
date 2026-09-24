# Privacy in the Kindred Grove demo theme

**Last reviewed: 2026-09-24** · **Scope: theme-owned behavior in the reviewed Shopify development artifact**

This page explains what the custom theme does with visitor information and where its control ends. It is implementation documentation, not a substitute for the merchant’s privacy notice or a determination of which laws apply. The demo’s actual data practices, vendor settings, and the merchant’s identity and contact details must be verified before commercial use.

## What the theme does

Optional theme features check Shopify’s Customer Privacy API before processing. The theme requires both an explicit `yes` consent for the relevant purpose and Shopify’s corresponding `*ProcessingAllowed()` / allowed-processing method to return `true`. Missing or failed API access and invalid privacy configuration fail closed. The theme reads consent; it does not write consent, edit Shopify cookies, or grant consent automatically. Visitors use Shopify’s native privacy banner and preferences controls.

The theme also treats browser Global Privacy Control (GPC) and Do Not Track (DNT) signals as denials for its own analytics, marketing, and data-sharing purposes. In the Phase 2 tests, these signals were explicitly emulated before navigation; that is evidence of the theme adapter’s behavior, not a test of an operating system or every browser’s native settings. Shopify, apps, pixels, and platform services can have separate behavior.

| Theme data or interaction | Purpose and condition | Destination and retention | What was verified |
|---|---|---|---|
| Feature-flag visitor UUID and assignments | A/B assignment. Persistent assignment state is created only when Shopify allows analytics and the visitor has explicitly consented to analytics. A query override is a test/development feature, not a visitor identity. | Browser local storage only. On analytics denial or withdrawal, the theme removes its configured visitor, assignment, and override keys when storage is available. Other storage keys are left alone. No exposure event or visitor-ID payload is emitted by this feature. | Security tests cover denied/granted behavior, owned-key removal, and blocked storage. Phase 2 browser checks cover consent and GPC/DNT signal emulation. |
| Recently viewed product handles and timestamps | Product personalization only when preferences consent and Shopify’s preferences-processing permission both allow it. | Browser local storage; at most 12 records, each no older than 30 days. Allowed product detail reads use same-origin Shopify product JSON routes. On denial or withdrawal, the owned history key is removed and the component is hidden. | Security tests cover consent gating, bounded retention, stale records, same-origin reads, and denial cleanup. This is theme-local retention, not a schedule for Shopify order data. |
| Pantry quiz choices, including dietary selections | Calculate a requested on-page recommendation. The quiz does not infer a diagnosis or transmit choices. | Component memory for the current page only; cleared when the quiz resets or its page/component is discarded. It does not use local storage, session storage, analytics, or answer/persona telemetry. A legacy answer key is removed on startup; the theme does not read or restore it. | Browser flow answered five questions, followed a result to a real collection page, reloaded and verified the quiz reset. Security checks verified the legacy key was absent from both local and session storage. |
| Announcement dismissal | Hide the current announcement for this page view. | Page memory only; no persistent dismissal write. Narrowly scoped legacy theme-owned keys are removed at startup. | Security tests cover no persistence and cleanup boundaries. |
| Cart actions | Add, change, or remove sample products in the demo; normal commerce behavior when the demo guard is disabled. | Shopify cart endpoints and Shopify’s cart/session infrastructure. Cart and eventual order data are not theme-local records; Shopify and merchant retention, fulfillment, payment, and account practices govern them. | Phase 2 browser tests verified add 0→1→2→0 and cart-state reconciliation. No order was placed. |
| Merchant-authored quiz, persona, and feature definitions | Render maintained storefront content and configuration. These are not visitor answers. | Shopify theme settings and escaped HTML template attributes; parsed as JSON by the theme. | Security tests cover strict shape/size validation, HTML context escaping, and translated defaults. Alternate quiz rendering confirmed valid live configuration. |
| Consent state and platform commerce data | Shopify’s privacy and commerce functions. The theme reads consent state but does not control Shopify’s platform collection. | Shopify and any services configured by the merchant. Their individual retention and subprocessors are not set by theme code. | Native consent UI was tested for unknown state, accept, partial preferences, withdrawal, and reload. Platform-wide processing was not exhaustively measured. |

The details above describe the custom theme only. They do not establish that every request to Shopify or another provider is optional, that no platform or app tracking occurs, or that a legal consent requirement has been satisfied.

## Services and control boundaries

| Service or code boundary | Known state | Merchant action before launch |
|---|---|---|
| Custom theme scripts | Named authored scripts were inspected for this release. Optional theme telemetry is disabled; the assigned layout no longer loads Sentry or Web Vitals. This is a scoped source claim, not an inventory of every script delivered to a browser. | Recheck the published theme, app embeds, pixels, tag managers, and network requests after any app or theme change. |
| Shopify Customer Privacy API and native banner | The theme calls the purpose-specific API. The native banner/preferences UI was exercised in the development preview. Shopify’s banner settings were saved and reloaded with 299/299 region entries selected on 2026-09-24. | Recheck regions, purpose defaults, language, links, and behavior for intended markets after any Shopify settings or region change. A region selection is not a legal applicability decision. |
| Shopify Network Intelligence | Observed enabled in Shopify admin on 2026-09-24. The attempted disable flow indicated Shop would need to be uninstalled; it was cancelled and no setting was changed. | Determine the store’s actual platform configuration and need before launch. Do not infer that theme consent checks control this platform feature. |
| Installed apps, app pixels, Shopify-hosted checkout and accounts | Their collection, destinations, and retention are outside theme controls and were not exhaustively inventoried. The account route redirected to a Shopify-hosted surface in the tested development context. | Inventory each app, pixel, embedded script, and service; document purpose, categories, regions, contractual role, retention/deletion, and consent integration. Test hosted checkout/accounts separately. |
| Newsletter and contact | With the theme’s `demo_mode` setting enabled, theme-rendered newsletter/contact submissions are replaced by disabled copy. No customer form was submitted during Phase 2. Turning demo mode off restores Shopify-native theme form routes, but does not itself prove the merchant’s recipient, consent, suppression, or retention process. | Keep disabled until the merchant identifies the destination and owner, verifies notices and lawful signup, tests unsubscribe/suppression, and approves real submissions. Review any app or external recipient independently. |

## Visitor choices and requests

The visible **Your Privacy Choices** control opens Shopify’s native privacy choices. A visitor may change the choices offered there. Theme components react to the updated purpose state; on denial or withdrawal they remove only their own configured state where storage is available. Storage access can be blocked or fail, so deletion from browser storage is best-effort; the component fails closed when permission or storage is unavailable.

The theme does not itself provide a complete access, correction, deletion, portability, or appeal workflow. A live merchant must publish its own accurate privacy notice and designate working request channels. Shopify’s admin privacy-request tools and app/vendor request paths may be part of that process, but must be confirmed for the actual store. Do not promise that the theme has fulfilled a request merely because a browser key was removed.

A practical request-handling record should capture, without retaining unnecessary sensitive detail:

1. Date received, request type, applicable jurisdiction, and responsible owner.
2. Proportionate identity/authority check and the systems searched (Shopify, email platform, apps, backups, analytics, and any support tooling actually used).
3. Data found, purpose, source, recipients, applicable exception or retention obligation, and action sent to each processor.
4. Response date, decision, completion evidence, and any explanation or escalation required by applicable law.

Use the deadline, response method, verification standard, and any appeal process for the law that applies to that request. Do not apply one jurisdiction’s process to every visitor by assumption.

## Retention and deletion

Theme-only retention is described in the inventory: quiz answers and announcement dismissal are page-memory-only; recently viewed history is bounded to 12 entries/30 days; feature-flag keys are conditional on analytics permission and are removed on denial/withdrawal where browser storage permits. This does not specify or shorten the retention needed for orders, tax records, fraud prevention, support, email suppression, legal claims, or other Shopify/app records.

Before launch, the merchant must approve a retention schedule by data category and purpose. It should identify the system of record, retention trigger, legal/business reason, deletion mechanism, processor deletion evidence, backup limits, and any exception. Suppression records may need to be retained to prevent renewed marketing; define that narrowly with the email provider and applicable law. Remove data when the purpose and any justified retention period end.

## Developer and merchant release checks

Before disabling demo mode or enabling a new vendor, market, or data purpose:

- Update the data and vendor inventory from the actual published theme, Shopify admin, app embeds/pixels, and observed browser requests.
- Reconcile the privacy notice and any notice-at-collection links with real fields, recipients, purposes, retention, rights, and contact channels.
- Verify the native banner and preference/withdrawal behavior for intended regions; test GPC where legally relevant. Keep functional no-consent commerce paths available where allowed.
- Confirm every optional theme feature is gated by the correct purpose. Keep any new identifiers, analytics events, or form submissions out of scope until consent, purpose, retention, and destination are reviewed.
- Exercise access/deletion requests through the actual merchant and vendor workflow before relying on it.
- Keep test evidence free of customer content, cookie values, credentials, and personal data; record only states, key names, request categories, and redacted output.

## Phase 2 verification

For the reviewed development artifact on 2026-09-24, the integrated browser suite passed **41 tests, 0 failed, 5 documented skips, 0 flaky**; the local security/configuration suite passed **95/95**; and all **150/150** selected local, frozen, and downloaded theme-file hashes matched. The existing Contact page was used with Shopify’s alternate-template suffix to test the quiz and wholesale layouts without creating merchant page resources. Their actual flows passed **2/2**; the quiz result navigated to an HTTP 200 collection with products, reset after reload, and left no legacy answer key in local or session storage. Active quiz and wholesale axe scans passed **2/2** with zero WCAG 2.2 A/AA violations, including a visible quiz progressbar with an accessible name.

Five integrated-suite skips were documented: single-variant product, canonical Quiz page (404), canonical Wholesale page (404), missing test article, and account route redirecting to a Shopify-hosted surface. Alternate templates were tested, but canonical pages were not created. The broader manual screen-reader/complete zoom review and exhaustive third-party/platform request inventory remain open. These results establish development-artifact behavior, not commercial launch or legal compliance.

## Technical references

- [Shopify Customer Privacy API](https://shopify.dev/docs/api/customer-privacy) — purpose-specific permission methods, visitor consent events, and native banner integration.
- [California Privacy Protection Agency: consumer rights and GPC](https://cppa.ca.gov/faq) — applicable California rights and opt-out preference signals.
- [FTC: Protecting Personal Information](https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business) — practical inventory, minimization, retention, and safeguards guidance.
