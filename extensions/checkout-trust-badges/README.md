# Checkout UI Extension — Trust Badges

Renders a compact row of trust badges (halal-certified, carbon-neutral shipping, 30-day returns) on the Shopify Checkout page.

## Structure

```
extensions/checkout-trust-badges/
├── shopify.extension.toml     # Extension manifest (targets, settings, capabilities)
├── src/Checkout.tsx           # React component using @shopify/ui-extensions-react
├── locales/en.default.json    # Translatable strings
├── package.json               # Dependencies (pinned to 2025.10.x API version)
├── tsconfig.json              # TypeScript strict mode
└── README.md
```

## Why this lives in the theme repo

Kindred Grove is a theme-only project. Checkout UI extensions normally live in a **Shopify app** project (created via `shopify app init`), not a theme. We scaffold the extension here as a **portfolio artifact** to demonstrate:

1. Correct manifest shape (`api_version`, `targeting`, `capabilities`, `settings`).
2. React + TypeScript component using the current `@shopify/ui-extensions-react/checkout` surface.
3. Translatable UI via `useTranslate()` + `locales/en.default.json`.

To actually deploy this, the directory would be moved into a Shopify app project and run through `shopify app deploy`. This is documented in the case study rather than performed here — deploying checkout extensions requires Shopify Plus on production and a Partners app. The dev store preview works via `shopify app dev` from the app project root.

## Target

`purchase.checkout.block.render` — generic block target that the merchant positions in the checkout editor. Alternatives we considered: `purchase.checkout.delivery-address.render-before` (pinned to address step), `purchase.checkout.payment-method.render-after` (below payment). The generic block target keeps placement flexible.

## Capabilities

- `network_access: false` — no external calls; static strings only.
- `block_progress: false` — never prevents checkout progression.
- `api_access: true` — reads `useSettings()` so the merchant can toggle each badge from the checkout editor.

## Settings

| Key              | Type    | Default | Purpose                               |
|------------------|---------|---------|---------------------------------------|
| `show_halal`     | boolean | true    | Show halal-certified badge            |
| `show_shipping`  | boolean | true    | Show carbon-neutral shipping badge    |
| `show_returns`   | boolean | true    | Show 30-day returns badge             |

## Deploy flow (out of scope for this repo)

```bash
# From the sibling Shopify app project:
cd ../kindred-grove-app
shopify app deploy   # NOT run from here; intentionally scaffold-only
```
