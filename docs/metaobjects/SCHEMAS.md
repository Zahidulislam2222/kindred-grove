# Metaobject Schemas — Kindred Grove

This doc defines the metaobject definitions and product metafield keys that the Kindred Grove theme expects. The theme cannot create these from code — they must be created in the Shopify admin under **Settings → Custom data**. Blocks that read these records fall back to manual block settings when the reference is blank, so the theme works end-to-end on a cold store, but the full PDP experience (shared farm records, reusable certifications, cross-linked recipes) requires these to exist.

Per ADR-003, these definitions survive the Phase 2 Hydrogen migration — the Storefront API exposes the same records under the same handles.

Updated: 2026-04-19 (Day 8)

---

## Metaobject definitions

Create each in **Settings → Custom data → Metaobjects → Add definition**. Use the exact `type` (handle) values below — blocks reference them.

### 1. `farm`

Single source of truth for a farm. Multiple products can reference the same farm.

| Field | Key | Type | Required | Notes |
|---|---|---|---|---|
| Name | `name` | Single-line text | Yes | e.g. "Abu Hamza Grove" |
| Region | `region` | Metaobject reference → `region` | No | If regions aren't modeled, leave blank and fill Country manually |
| Country | `country` | Single-line text | No | e.g. "Palestine" |
| Photo | `photo` | File reference (image) | No | Square crop recommended, min 800×800 |
| Farmer | `farmer` | Metaobject reference → `farmer` | No | Shared farmer records |
| Established year | `established_year` | Integer | No | e.g. 1947 |
| Story | `story` | Multi-line text (rich text) | Yes | 2–4 paragraphs |
| Harvest season | `harvest_season` | Single-line text | No | e.g. "October (cold-pressed within 4h)" |

### 2. `farmer`

Optional — describes an individual farmer or family. Linked from `farm.farmer`.

| Field | Key | Type | Required |
|---|---|---|---|
| Name | `name` | Single-line text | Yes |
| Photo | `photo` | File reference (image) | No |
| Generation | `generation` | Integer | No |
| Quote | `quote` | Multi-line text | No |

### 3. `region`

Optional — grouping record. Useful if the merchant wants a dedicated `/origins/<region-handle>` page surfacing all farms in a region.

| Field | Key | Type | Required |
|---|---|---|---|
| Name | `name` | Single-line text | Yes |
| Country | `country` | Single-line text | Yes |
| Climate | `climate` | Single-line text | No |
| Soil | `soil` | Single-line text | No |

### 4. `certification`

A certifying body + evidence. One record per certificate, referenced by multiple products.

| Field | Key | Type | Required | Notes |
|---|---|---|---|---|
| Name | `name` | Single-line text | Yes | e.g. "Halal", "Organic", "Fair Trade" |
| Body | `body` | Single-line text | No | e.g. "IFANCA", "USDA Organic" |
| Certificate PDF | `certificate_pdf` | File reference (PDF) | No | Optional downloadable evidence |
| Verified date | `verified_date` | Date | No | Most recent renewal date |
| Icon key | `icon_key` | Single-line text | No | Icon name from `snippets/icon.liquid` ("check" by default) |

### 5. `recipe`

Recipe content linked from products that pair well with it.

| Field | Key | Type | Required |
|---|---|---|---|
| Name | `name` | Single-line text | Yes |
| Hero image | `hero_image` | File reference (image) | Yes |
| Lead | `lead` | Multi-line text | No |
| Ingredients | `ingredients` | Multi-line text (one per line) | Yes |
| Steps | `steps` | Multi-line rich text | Yes |
| Linked products | `linked_products` | List of product references | No |
| Time | `time_minutes` | Integer | No |

---

## Page metafield keys (Day 11 — origin/farm detail template)

Create under namespace `custom` in **Settings → Custom data → Pages → Add definition**. Read by `sections/main-origin.liquid` via `templates/page.origin.json`.

| Field | Key | Type | Required | Notes |
|---|---|---|---|---|
| Farm | `farm` | Metaobject reference → `farm` | Yes | The origin page displays this farm's record |
| Linked products | `linked_products` | List of product references | No | Products sourced from this farm. Shown in a 4-column grid. If blank, no products section. |

After definitions exist, create each origin page under **Online Store → Pages → Add page**, assign template `page.origin`, and pick the farm metaobject in the page's metafield panel.

## Product metafield keys

All live under namespace `custom`. Create each in **Settings → Custom data → Products → Add definition**.

| Field | Key | Type | Notes |
|---|---|---|---|
| Farm | `farm` | Metaobject reference → `farm` | Single reference |
| Certifications | `certifications` | List of metaobject references → `certification` | |
| Tasting notes | `tasting_notes` | List of single-line text | Short descriptors: "grassy", "peppery", "bitter finish" |
| Harvest date | `harvest_date` | Date | |
| Altitude (meters) | `altitude` | Integer | Optional, for oils grown at altitude |
| Processing method | `processing_method` | Single-line text | e.g. "Cold-pressed within 4 hours" |
| Recipe suggestions | `recipe_suggestions` | List of metaobject references → `recipe` | |
| Product pairings | `pairings` | List of product references | |
| GTIN | `gtin` | Single-line text | For JSON-LD Product schema |

---

## How blocks consume these

| Block | Reads | Falls back to |
|---|---|---|
| `blocks/farm-story.liquid` | `product.metafields.custom.farm.value` (name, region, story, image, farmer, harvest_season) | Manual block settings (headline, body, image, meta 1-3) |
| `blocks/certifications.liquid` | `product.metafields.custom.certifications.value` (list of Certification records) | Hidden when list empty |
| `blocks/recipe-suggestions.liquid` | `product.metafields.custom.recipe_suggestions.value` (list of Recipe records) | Hidden when list empty |

This pattern — metaobject reference first, block settings fallback — means a freshly-installed dev store renders usable blocks on Day 0 and progressively gets richer as the merchant populates custom data.

---

## Setup checklist for a new merchant

1. Create the 5 metaobject definitions above (fields + keys exactly as listed).
2. Create one record per physical farm the brand sources from.
3. Create one record per certification the brand holds.
4. Create the product metafield definitions with the keys above.
5. On each product, populate `farm` + `certifications` + any optional product-specific fields.
6. Save. The PDP blocks now read live from metaobjects.

A CLI-script automation for step 1 (using the Admin GraphQL `metaobjectDefinitionCreate` mutation) is tracked in `docs/ROADMAP.md` as a Phase 2 task — for Phase 1 we keep this manual to preserve the merchant-controlled data pattern.
