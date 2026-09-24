# Performance evidence and budgets

Updated 2026-09-24. Current desktop/mobile Lighthouse scores and field Core Web Vitals have not been measured in this execution. The budgets below are configuration targets, not achieved results or enforced remote branch checks.

## Configured targets

`lighthouserc.json` owns the assertions and uses three simulated desktop runs. Its current settings require performance ≥0.90; accessibility, best practices and SEO ≥0.95; LCP ≤2.5 seconds; CLS ≤0.10. Warning budgets include FCP ≤1.8 seconds, TBT ≤200 ms, document ≤50 KiB, scripts ≤200 KiB, styles ≤100 KiB, images ≤500 KiB and ≤50 requests. Inspect the file for the complete current values rather than copying new defaults into scripts.

A desktop simulation does not establish mobile performance. TBT is a lab diagnostic, not a measured field INP. The manual Lighthouse workflow requires its own configuration and verified run; hosted status has not been established.

## Source-observed design

- Liquid renders initial content. Theme components use vanilla JavaScript and deferred loading; no application bundler is required to render the storefront.
- `snippets/image.liquid` emits dimensions, responsive Shopify image URLs, lazy loading by default and optional priority hints. Audit direct image markup separately; this helper does not prove every image is correctly configured.
- The layout preconnects to Shopify's image CDN and emits font-face declarations with swap behavior. Critical CSS and the external style chain need byte and paint measurements before performance claims.
- The direction-aware header reserves physical layout height while its visible-height variable controls the hero stage. Browser geometry tests cover hiding/revealing without adding an empty band; actual video/chapter/reduced-motion checks passed in Phase 2.
- Reduced-motion mode retains the poster and avoids loading the journey video. Failed media must preserve shopping access; these behaviors have dedicated browser cases.
- Optional custom Sentry/Web Vitals loaders have been removed locally. There is no active theme RUM pipeline established by this work. Platform/app scripts remain separate.

## Current media cost and constraints

The local `grove-journey.mp4` is approximately 5.5 MiB on disk. Current playback fetches the entire file as a blob to work around the local Shopify media proxy's seekable-range behavior. This trades startup bytes and memory for deterministic seeking; it is not a proven optimum for low-bandwidth phones. Disk bytes are not an HTTP transfer measurement.

Before public release, measure cold-cache transfer, first usable frame, LCP/CLS and memory on documented desktop/mobile profiles. Compare native CDN range playback against the blob approach on the actual hosted theme; retain the poster, pause control, reduced-motion behavior and failure recovery. Any recompression must preserve image quality and asset rights, with before/after sizes and visual inspection. Do not publish a new codec or native-player change without browser compatibility checks.

Optional product UI now uses the reviewed bounded request/cancellation runtime. No automatic cart-write retries are allowed: an interrupted response can leave the server-side outcome unknown.

## Reproducible regression checks

1. Record theme revision/role, route, market, viewport, device/profile, cache state, consent state and tool version. Hide the native preview toolbar only through Shopify's supported preview configuration when appropriate; verify the intended theme still renders.
2. Confirm real content before measuring. Password pages, bot challenges and wrong-market unavailable products are not valid shopping performance samples.
3. Retain reports without credentials or customer data. Compare like-for-like runs; report medians and variation, not a cherry-picked score.
4. Inspect the changed request waterfall, media bytes, long tasks and layout shifts. Fix regressions before considering a budget change. Any budget adjustment requires a reason and separate review.
5. Keep keyboard, reduced-motion and cart behavior passing alongside speed checks. Fast rendering does not excuse broken purchase behavior.

[SCALABILITY.md](SCALABILITY.md) separates concurrency from throughput and documents local mock observations. [OPERATIONS.md](OPERATIONS.md) defines the unmeasured 99% availability target and recovery gates. Neither a Lighthouse score nor a local mock establishes Shopify capacity or uptime.
