# ADR 009: Retire the wholesale Admin API proxy

- Status: Accepted
- Date: 2026-09-24

## Context

The wholesale inquiry already has a native Shopify Liquid `contact` form. The
separate Worker accepted public submissions and could create Shopify draft
orders through the Admin API. The local theme had an optional Worker URL
forwarding path. A deployed endpoint and its current configuration have not
been verified; this decision covers repository source only and does not claim
that any remote Worker was removed.

The browser honeypot and timing checks cannot enforce server-side admission or
authorization. A successful browser request also cannot safely stand in for a
verified order-creation result.

## Decision

Retire the local proxy source as an inert HTTP 410 response that does not read
request data or environment bindings and makes no network request. Remove the
Worker URL and unused Klaviyo list setting from the theme block. Keep the native
Shopify contact form, its wholesale tag, and the browser honeypot. An optional,
disabled-by-default in-memory cooldown may improve user experience, but it is
explicitly not a server security control. The theme does not create client-side
success states; Shopify remains authoritative for contact submission.

Shopify documents the native contact form and describes platform CAPTCHA
protection for customer-facing forms. Those are platform-owned controls; this
repository neither configures nor independently verifies their runtime state:

- [Liquid `form` tag](https://shopify.dev/docs/api/liquid/tags/form)
- [Add a contact form](https://shopify.dev/docs/storefronts/themes/customer-engagement/add-contact-form)
- [CAPTCHA for storefront forms](https://shopify.dev/docs/storefronts/themes/trust-security/captcha)

## Consequences

Wholesale inquiries continue through Shopify's native contact flow. Automated
draft-order creation and Klaviyo wholesale auto-subscription are no longer
offered by this theme. The local Worker source fails closed if used, but remote
deployment state remains unknown and requires a separate platform-side
inventory before any claim of removal.

Any future backend replacement must first establish a documented owner and
deployment boundary, authenticated and authorized callers, bounded request
parsing, admission/rate limits, idempotent side effects, least-privilege Admin
API access, truthful result handling, capacity/cost evidence, privacy/legal
review, and independent security review. The browser cooldown or honeypot is
not a substitute for those controls.
