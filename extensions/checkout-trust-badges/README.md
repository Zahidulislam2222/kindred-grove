# Legacy checkout-extension example

**Status: unsupported reference scaffold; not built, tested or deployed as part of the accepted storefront.** Do not treat this folder as a ready-to-install Shopify app. It is preserved to explain an earlier design direction and the work a future checkout integration would require.

## What is present

The folder contains a React/TypeScript component, a Shopify extension manifest, English strings and a separate package manifest. It targets `purchase.checkout.block.render` and illustrates settings-controlled badges. It is isolated from the native theme and its root test dependency lockfile.

The original example includes halal-certification, carbon-neutral shipping and 30-day returns text, enabled by default in the component. Those are **unsubstantiated example claims**. They must not be displayed to customers without evidence and an approved policy. The accepted demo theme suppresses unsupported claims; this separate scaffold is not covered by that theme guard.

## Compatibility gap

The manifest declares API version `2025-10`, while the source imports React-based checkout components. Shopify documents `2025-07` as the last API version supporting that React component surface; current extension examples use Preact/web components. The package ranges and source here have not been installed or validated as a working combination. [Shopify legacy React reference](https://shopify.dev/docs/api/checkout-ui-extensions/2025-07), [current checkout extension guide](https://shopify.dev/docs/api/checkout-ui-extensions/latest).

`api_access` is an API capability, not evidence of authentication/authorization or a requirement established merely by reading settings. All capabilities must be re-evaluated for the selected target and current API version.

## Future implementation gate

1. Establish an actual checkout need and verify target/store/app entitlements from current Shopify documentation. Do not purchase an upgrade as part of this demo.
2. Create or identify the authorized Shopify app project and use the current supported extension template. This theme repository is not that app project.
3. Replace the legacy API/source/dependencies together, lock verified registry versions, minimize capabilities and keep all commercial claims disabled until substantiated.
4. Keep approved wording in settings/locales with evidence owners; test missing settings, localization, accessibility and unsupported targets.
5. Run the app's type/build/security checks and native development checkout flow before independent review and a separate authorized deployment.

The existing `build`, `dev` and `deploy` package commands assume an app context that is absent here. They are not part of the root quickstart, CI, GitHub publication or current live release. See [architecture](../../docs/ARCHITECTURE.md), [demo boundaries](../../docs/DEMO-SAFETY.md) and [roadmap](../../docs/ROADMAP.md).
