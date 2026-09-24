# Merchant guide

This guide describes the current Kindred Grove demonstration theme and the steps a merchant would complete before real commerce. Use a development/unpublished theme for changes and inspect its actual role in Shopify; a theme name is not its publication status.

## Current storefront

The Grove homepage uses a cinematic opening, synchronized chapter wording, cream/terracotta styling, product imagery and shopping interactions. Its header hides while scrolling down and returns while scrolling up or using navigation. The film supports pause and reduced motion. Product/collection templates use real Shopify catalog data, while prices are visibly labeled as samples in demo mode.

The accepted development checks cover product browsing, cart add/change/remove, consent controls, header/video, keyboard/focus, narrow layouts and mobile navigation without JavaScript. Optional template files do not create Shopify page resources: this store has no canonical Quiz or Wholesale page and no test article. English/Arabic locale files do not establish that both languages or every currency are published in Shopify Markets.

## Where content belongs

| Content or action | Authoritative location |
|---|---|
| Product titles, descriptions, variants, prices and inventory | Shopify product/catalog administration |
| Homepage film choice, imagery, chapter wording and merchandising | The intended theme's Grove section settings |
| Brand presentation and demo mode | Theme settings and the theme's checked configuration |
| Interface translations | Locale files; storefront language publication is a separate merchant setting |
| Farm, recipe, certification and related editorial records | Reviewed metaobject definitions and entries |
| Pages and assigned templates | Shopify page administration, then theme template assignment |
| Enabled destinations, currencies, tax and shipping rules | Shopify Markets and merchant commerce settings |
| Native consent banner and platform privacy settings | Shopify customer-privacy administration |

Use [configuration ownership](CONFIGURATION.md) to identify developer-managed limits and [metaobject schemas](metaobjects/SCHEMAS.md) for content definitions. Never put tokens, customer data or private documents in theme settings.

## Safe editing workflow

1. Confirm the intended unpublished theme and capture the current baseline before making changes.
2. Update content/settings in the appropriate owner, keeping the local source and reviewed configuration synchronized.
3. Preview desktop/mobile layouts, check keyboard access, readable text, product links, sample-price labels and consent controls.
4. Run relevant automated and real-flow checks; changes to media require performance and accessibility review.
5. Review the exact artifact and separate its upload from publication. Saving the currently live theme changes the live storefront; saving an unpublished theme does not itself make it live.

Use the [release guide](RELEASE.md) for drift comparison, reviewed uploads and rollback. A development watcher can upload edits automatically; it is unsuitable as an unnoticed publishing mechanism.

## Homepage and media

Edit each chapter's heading, emphasized phrase, eyebrow and supporting text together so the film/copy transition tells one coherent story. Keep essential product/navigation information available in the static or failed-media state. Check the beginning, middle and end while scrolling in both directions, then pause and use the keyboard.

Current journey media is approximately 5.5 MiB on disk and uses complete-blob loading. Before a commercial campaign, measure real desktop/mobile transfer, first-frame time and memory, then compare range delivery or smaller encodings. Maintain the poster and reduced-motion fallback. Media rights and source/creator evidence must be recorded in [MEDIA-PROVENANCE.md](MEDIA-PROVENANCE.md); footage must not imply a verified farm or supplier relationship without evidence.

## Products, claims and prices

Demo mode is on by default. It labels sample prices and suppresses theme-generated promotional claims, review/certification content, sample structured data and checkout controls. The cart remains interactive so visitors can evaluate the interface without ordering.

Before enabling commerce, supply and verify real product facts: ingredients, allergens, nutrition/quantity, origin where required, responsible operator, storage/use instructions, certifications and authorized claims. Product information requirements depend on product and destination. Maintain evidence for origin, sustainability and certification wording; do not use the illustrative seed catalog as proof.

A Shopify compare-at price is not a verified legal price-history record. Approve discount history, final/unit pricing where applicable, tax/shipping disclosure and refund/withdrawal handling for each supported market. Free-shipping progress is hidden in demo and requires explicit policy verification plus matching currency outside demo. See [US/EU requirements](COMPLIANCE-RESEARCH.md).

## Cart and checkout

The drawer supports actual Shopify cart add, quantity change and removal. Verified development flow was 0→1→2→0. A write with an uncertain network outcome is not blindly repeated; the runtime reconciles cart state. Check status messages and item totals before repeating an action.

Demo mode disables checkout controls rendered by this theme. It does not switch Shopify payments to test mode or disable direct platform checkout URLs. Hosted accounts/checkout and app interfaces require their own review. Do not enter real personal/payment data for a portfolio demonstration. The checkout extension folder is a legacy unsupported example, not an installed badge feature.

## Quiz, wholesale, newsletter and accounts

The quiz questions/personas are merchant-authored configuration. Answers stay in component memory, do not persist after reload and are not sent to telemetry. Enable its feature and create/assign the actual page only through the reviewed release process. The development functional check used an alternate Contact template; it did not create a public Quiz page.

Newsletter and wholesale/contact forms are replaced with informational copy in demo mode. Outside demo, the source retains native Shopify handling. There is no custom Klaviyo forwarding or automatic wholesale draft-order creation; the old Worker is retired. Client cooldowns/honeypots are not server security guarantees. Establish actual inbox ownership, lawful collection, retention, unsubscribe/suppression and response procedures before enabling forms.

Theme-rendered classic account/customer details and comment/cart-note forms are guarded in demo. Shopify-hosted account surfaces can bypass theme templates; do not assume theme settings govern them.

## Privacy and localization

Visitors use Shopify's native consent controls. The banner was configured across all 299 listed regions. Optional theme storage needs explicit consent and platform permission; withdrawal removes theme-owned optional keys. GPC/DNT deny optional analytics/marketing/sharing purposes in the theme. Network Intelligence remains enabled and app/platform processing has a separate merchant review.

Current native markets observed for this project were United States and Canada. EU selling, tax, labels, translations and fulfillment require market-specific preparation. A visitor's country selection must use Shopify localization rather than changing currency text alone.

No theme Sentry/Web Vitals/GA event pipeline or Klaviyo signup integration is enabled by the accepted source. Adding an app, pixel or analytics vendor requires a new privacy/security/performance review and a verified cost decision.

## Commercial launch and maintenance

Assign owners for business identity/contact, product evidence, privacy requests, legal/tax decisions, support, incidents and release approval. Use the requirement register and future roadmap to close each gate. Record changes to vendors, countries, data purposes, labels and promotional claims before enabling them.

Regularly review dependency/scanner alerts, real-flow checks, media/performance, accessibility, consent, store permissions and backup/recovery evidence. Track the proposed 99% availability objective and its browsing/cart/checkout indicators as described in [operations](OPERATIONS.md). Reach larger traffic stages through the evidence gates in [scalability](SCALABILITY.md), with a named owner and approved platform plan.

For errors, preserve a redacted reproduction and exact revision/market/route, then follow the incident and rollback procedure. Never send customer data, passwords or private recovery notes to a public issue.
