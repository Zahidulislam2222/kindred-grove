# ADR-006 — Separate public case-study hosting proposal

**Status:** Historical proposal, not an implemented hosting service. Documentation review: 2026-10-08.

## Context and decision

A future public case-study website could present the architecture, design rationale and verified outcomes separately from the customer storefront. The current public handoff is the GitHub repository and engineering documentation; no standalone case-study hosting or framework is delivered by this repository.

Cloudflare Pages was considered for a future static case study. Any implementation must first verify current free entitlement, build limits, custom-domain ownership, privacy and operational requirements. Existing project records do not establish a created Pages project or guarantee zero future cost. [Cloudflare Pages](https://developers.cloudflare.com/pages/).

## Current scope

Keep the native Shopify storefront and accepted visitor-password access. Do not redirect its domain, introduce headless hosting or activate an external integration as part of documentation publication. Source publication and an optional later case-study deployment have different acceptance criteria.

## Future admission gate

Approve audience and content, verify asset rights, prepare a separate concrete site proposal, qualify provider limits/costs and establish deployment/rollback/maintenance ownership. Any paid action requires explicit prior cost approval. Include only scrubbed public evidence; internal client narrative and infrastructure/recovery details stay private.

Related: [roadmap](../ROADMAP.md), [requirements](../PROJECT-REQUIREMENTS.md), [media provenance](../MEDIA-PROVENANCE.md).
