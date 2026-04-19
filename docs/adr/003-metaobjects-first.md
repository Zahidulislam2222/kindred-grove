# ADR-003 — Metaobjects-first data model over metafields-only

**Status:** Accepted
**Date:** 2026-04-19 (Day 8)
**Deciders:** Zahidul Islam (developer) on behalf of the Kindred Grove engagement

---

## Context

Kindred Grove's product content has structure beyond what the base Shopify product model captures. A bottle of olive oil carries: the farm it came from (name, region, country, farmer, established year, story, harvest season, photo), the harvest date, the altitude, the processing method, a list of certifications (Halal, Organic, Fair Trade — each with issuing body and certificate PDF), tasting notes, pairing suggestions, and recipe suggestions linking to multi-step recipe content with their own photography.

Two shapes of this content exist in Shopify:

1. **Metafields on the product** — flat key/value pairs attached to a single product. Strings, numbers, dates, single references. Good for small, product-scoped data.
2. **Metaobjects** — named, schema-backed content types that exist independently of products and can be referenced by products, pages, or other metaobjects. A `Farm` metaobject is a first-class record with its own admin edit surface; many products can reference the same farm without copying data.

The realistic options for Kindred Grove's content architecture are:

1. **Metafields only.** Store everything flat on each product: `farm_name`, `farm_region`, `farm_story`, `farm_photo`. Simple, works today.
2. **Metaobjects-first.** Create `Farm`, `Farmer`, `Region`, `Certification`, `Recipe` metaobject definitions. Products hold a single `farm` metafield reference (to a `Farm` metaobject) and a list `certifications` metafield (to `Certification` metaobjects). The UI reads the linked metaobjects.
3. **Headless CMS (Sanity / Contentful / Prismic).** Model content there, pull into Shopify at build time.
4. **JSON blob in theme settings.** Shove farm records into `config/settings_schema.json` as a single giant JSON textarea.

The Kindred Grove catalog has 8–12 SKUs across roughly 5 origin farms, 3 certifying bodies, and a growing recipe library. Several products share a farm (two olive oils from the Abu Hamza grove in Nablus). Several products share certifications (Halal on nearly everything). Merchant staff will edit all of this from the Shopify admin — they will not touch code.

## Decision

**We model Kindred Grove's structured content as Shopify metaobjects (Farm, Farmer, Region, Certification, Recipe) and link them from products via reference metafields.** Metafields are still used for small, product-scoped values (tasting_notes, harvest_date, altitude, processing_method, gtin) where there is no reusable record behind the value.

Operationally:

- Metaobject definitions are created in Shopify admin (Settings → Custom data → Metaobjects). The theme cannot create them from code.
- The canonical schema is documented in `docs/metaobjects/SCHEMAS.md` so a merchant taking over this store can recreate it from scratch.
- Each product carries a `product.metafields.custom.farm` single-reference to one Farm metaobject.
- Each product carries a `product.metafields.custom.certifications` list-of-references to Certification metaobjects.
- Each product carries a `product.metafields.custom.recipe_suggestions` list-of-references to Recipe metaobjects.
- Blocks that display this content (`blocks/farm-story.liquid`, `blocks/certifications.liquid`, `blocks/recipe-suggestions.liquid`) read from the linked metaobjects when the metafield is set, and fall back to merchant-editable block settings when it is not — so the theme works end-to-end on a freshly installed dev store before any metaobjects exist.

## Consequences

### Positive

- **DRY.** Two products sharing a farm point to the same Farm record. Updating the farm story once updates every product that links to it. No copy-paste drift.
- **Merchant-editable without developer involvement.** A new Certification body gets a new Certification metaobject record, added to however many products need it. No theme deploy, no Liquid edit.
- **Deep content.** A Farm metaobject can hold an image, a farmer reference, a region reference, an established year, a harvest season, and a multi-paragraph story. Metafields alone would give you flat strings with no nested references.
- **Admin UX.** Merchants edit metaobjects from a dedicated admin screen with field labels, types, and validation — not by remembering metafield namespace keys.
- **Reusable across surfaces.** The same Farm metaobject can be surfaced on the PDP farm-story block, a dedicated `/origins/<handle>` page later, a collection page hero, or a case study — without duplicating content.
- **Storefront API friendly.** When Kindred Grove moves to Hydrogen (Phase 2 in `docs/ROADMAP.md`), metaobjects come through GraphQL cleanly as typed nodes. Metafield-only data is strings we'd have to re-type.
- **Portfolio signal.** 2026 agency work expects metaobjects. Shipping a PDP that reads from `Farm` and `Certification` metaobjects — not flat strings — is the signal Anderson Collaborative screens for.

### Negative / accepted tradeoffs

- **Initial setup cost.** The metaobject definitions have to be created in admin before any product can reference them. For a merchant deploying this theme cold, `docs/metaobjects/SCHEMAS.md` is the guide — without it, the PDP degrades to fallback settings (which is by design, but the feature surface is smaller).
- **Admin discoverability.** Metaobjects live in a different admin section than products. A new merchant staff member has to learn the pattern ("farms live in Custom data → Metaobjects, then I link them on each product"). We mitigate with `docs/MERCHANT-GUIDE.md` (ships Day 20).
- **Liquid verbosity.** Reading a linked metaobject is a chain: `product.metafields.custom.farm.value.name`. Falling-back gracefully when the reference is blank requires explicit guards in every block. Accepted; the guards are uniform and easy to read.
- **Theme-cold start.** On a brand-new dev store before metaobjects are populated, every PDP block falls back to block settings. That path has to be tested alongside the populated path — we cover this in the Day 14 Playwright E2E tests.
- **No theme-code creation.** The theme cannot bootstrap metaobject definitions. `docs/metaobjects/SCHEMAS.md` is the required manual step. We could automate with a Shopify CLI script that calls the Admin GraphQL `metaobjectDefinitionCreate` mutation; deferred to Phase 2.

### Neutral

- Metafields still exist alongside for small product-scoped values. There is no religious rule about "metaobjects for everything." Use the right tool per shape.
- Shopify's metaobject quota on Basic plans is 100,000 entries across all types. Kindred Grove uses maybe 30. Not a concern.

## Alternatives considered

1. **Metafields only.** Rejected. Every product that shares a farm stores a duplicate farm story. One farm-story edit means N product edits. Doesn't model the real data.
2. **Headless CMS (Sanity / Contentful).** Rejected for Phase 1. Adds a second content system, a sync pipeline, and vendor lock-in. Shopify metaobjects cover the shape we need at zero marginal cost and ship natively through the Liquid + GraphQL surface we already use. Revisit in Phase 2 only if the catalog grows past what Shopify metaobjects model cleanly.
3. **JSON blob in theme settings.** Rejected. Non-merchant-editable (merchants can't reasonably edit a 400-line JSON field in the customizer), not multilingual, not Storefront-API-accessible, and completely opaque in admin search.
4. **Dedicated pages + page metafields.** Rejected. Shopify pages are not structured content; they are WYSIWYG. You can attach metafields to a page but you can't reference the whole page as a typed record from a product the way a metaobject reference works.

## References

- Shopify metaobjects docs (queried via Shopify Dev MCP): `https://shopify.dev/docs/api/liquid/objects/metaobject` and admin custom-data guide.
- Schema setup guide shipped today: `docs/metaobjects/SCHEMAS.md`.
- Product metafield conventions used: see same guide's "Product metafield keys" section.
- Phase 2 Hydrogen migration: `docs/ROADMAP.md` — metaobject structure carries over cleanly to Hydrogen via Storefront API.
- Companion ADRs: ADR-001 commits to Theme Blocks (the editing surface merchants compose with); this ADR commits to metaobjects (the data surface those blocks read from).
