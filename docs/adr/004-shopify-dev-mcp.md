# ADR-004 — Official Shopify documentation and native discovery

**Status:** Current approach clarified, 2026-10-08; original decision dated 2026-04-19.

## Decision

Research Shopify behavior using current official documentation, native platform inventory and verified tool capabilities. Shopify Dev MCP is a possible documentation/schema tool when available; it is not proof of store access, merchant authorization or live deployment.

## Rationale

Theme/tool/API support changes over time. A model's memory, a historical package version or an assistant's confidence cannot establish current behavior. Use official references and actual native results before relying on a feature. Verify browser or CLI access in the active session and keep public records free of secrets.

## Consequences

The project can use connected browser, Shopify CLI and platform APIs within authorization. Store identity, theme roles, domains, permissions and deployed bytes are verified separately from source documentation. A tool connection does not permit paid actions, order placement, account changes or external messages.

No current dependency version, MCP session or account entitlement is inferred from this historical ADR. Toolchain versions belong to the maintained configuration manifest. [Shopify development tools](https://shopify.dev/docs/storefronts/themes/tools), [engineering workflow](../AI-WORKFLOW.md).
