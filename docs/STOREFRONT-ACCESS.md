# Storefront access and platform boundaries

Updated: 2026-10-08. The published theme and seven native content pages use Shopify's native rendering. The current app-development store requires a storefront visitor password. The user accepts sharing that password for project review; it remains private and is not recorded in public source, issues or documentation.

## Sharing the website

Share the website URL and its separate visitor password directly with the intended reviewer. Shopify documents this access method and explicitly says not to reuse the administrator's login password. Anyone receiving or forwarding the visitor password can view the storefront; it does not grant an administrator login. [Shopify access guidance](https://shopify.dev/docs/storefronts/themes/tools/development-stores#viewing-or-setting-the-password).

Visitors enter the password before browsing. Protected store pages remain hidden from search engines. Public source and documentation are readable on GitHub without the storefront password. [Shopify password guidance](https://help.shopify.com/en/manual/online-store/themes/password-page).

The current dev store cannot remove its password, show a custom password page, process real transactions, convert to production or transfer to a client. Theme CSS, DNS and theme publication cannot change those platform restrictions. An eligible production-store migration would need a separate merchant decision and explicit approval before any paid action. [Current dev-store rules](https://shopify.dev/docs/apps/build/stores/development-stores).

## Active storefront behavior

Native prices, cart, newsletter/contact/wholesale forms, cart notes and theme checkout controls are enabled in the current configuration. The pantry quiz is available independently of experiment assignments and keeps answers in page memory. Actual browser verification covers these controls; it does not establish real orders, payment readiness, inbox delivery, product provenance or legal approval. See [testing](TESTING.md), [backend contracts](BACKEND.md) and [project requirements](PROJECT-REQUIREMENTS.md).

The branded password template is theme source for an eligible platform configuration; Shopify's enforced development-store gate is displayed independently and cannot be replaced by that template here.

## Inactive legacy safeguards

Optional legacy restrictions are retained in source for compatibility and are inactive. If explicitly enabled, they suppress theme-generated personal-data forms, checkout controls, unsupported claims and structured data. They do not disable a direct Shopify checkout URL, select payment test/live mode, authorize real commerce or control an installed app.

Shopify-hosted customer account and checkout surfaces may bypass theme rendering. Theme settings cannot enforce access control on those platform surfaces or injected third-party flows. The current forms use native Shopify handling; there is no custom mailing-provider forwarding or automatic wholesale draft-order creation.

Free-shipping progress requires verified merchant policy and compatible shop/cart currencies. The theme must not invent an exchange rate or infer fulfillment promises. Native country selection uses Shopify localization.

Visitors use Shopify's native consent UI. The footer opens the native preferences bridge when available and otherwise reports its unavailability. Theme-owned optional storage needs explicit consent and platform permission; app/platform collection requires separate review. [Privacy](PRIVACY.md).
