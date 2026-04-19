# ADR-006 — Cloudflare Pages for the case-study site

**Status:** Accepted
**Date:** 2026-04-19 (Day 11 entry)
**Deciders:** Zahidul Islam (developer) on behalf of the Kindred Grove engagement

---

## Context

The engagement deliverables include a standalone case-study site that walks a reviewing CTO or agency lead through what was built, why, and how — separate from the Shopify storefront itself. The case study needs to host a static narrative (Markdown rendered to HTML), an embedded five-minute Loom walkthrough, before/after Lighthouse and accessibility screenshots, and a "live links" panel pointing back at the storefront and the GitHub repo. It is not transactional, has no auth, and has no server-side dynamic data.

The realistic free-tier hosts in 2026 for a small static-or-near-static site:

1. **Cloudflare Pages** — git-connected static host with a generous free tier (500 builds/month, unlimited bandwidth, fast global edge), built-in support for Astro/Next/Hugo, deploy previews on every PR, optional Cloudflare Workers Functions for any serverless leg later.
2. **Vercel** — first-class Next.js host, 100 GB/month bandwidth on the Hobby tier, deploy previews per PR, requires a Pro plan ($20/mo) for commercial use which is a non-starter for a portfolio engagement.
3. **GitHub Pages** — unlimited free, but no preview deploys per PR, no native build pipeline beyond a single Jekyll path, weaker edge cache, and no clean way to add a server-side leg if Phase 2 needs one.
4. **Netlify** — comparable to Cloudflare for static, but free tier bandwidth (100 GB) and build minutes (300/mo) are tighter and Netlify's roadmap has been quieter than Cloudflare's.

The constraints specific to this project: zero monthly cost in Phase 1, deploy previews on every PR (so iteration on the case-study copy can be reviewed in-line), an edge cache fast enough that the case study loads instantly even when reviewers click on it from a job ad in another country, and a path to add a Cloudflare Worker for a contact form or A/B endpoint later without changing host. Vercel is rejected on the commercial-use clause; Netlify and Pages are roughly comparable on the static side and Pages wins on bandwidth and on the Workers Functions story.

## Decision

**We host the case-study site on Cloudflare Pages, built from a separate `kindred-grove-case-study` repository (or a `case-study/` subdirectory deployed via a path-filtered build), using Astro as the static framework.**

Scope:

- The case-study site is its own deployable artifact — it does not live inside the Shopify theme repo's history. It either gets its own GitHub repository or sits under `case-study/` with the Cloudflare Pages build configured to chdir into that path.
- Astro is the framework choice because it ships zero JavaScript by default (the case study is content-led), supports Markdown-first authoring with MDX for embeds, and has a first-class Cloudflare Pages adapter.
- Custom domain is deferred to Phase 2; the Phase 1 case study lives at the default `*.pages.dev` URL, which is shareable and SEO-indexable.
- The Cloudflare Pages project is wired via the dashboard once (one-time browser action), then every push to `main` of the case-study repo triggers a production deploy and every PR triggers a preview deploy.

## Consequences

### Positive

- **Zero ongoing cost.** Free tier covers the realistic traffic envelope of a portfolio case study by several orders of magnitude.
- **PR previews land for free.** Every revision to the narrative gets a unique preview URL the developer can share for feedback before it lands on the live URL — the same iteration pattern the storefront's deploy workflows already use.
- **Edge speed.** Cloudflare's network puts the static bundle within ~30ms of most reviewers globally; the Lighthouse score of the case-study site itself becomes a meta-flex about the work.
- **Single-vendor story for Phase 2.** If we add a contact form, an A/B endpoint, or a Cloudflare R2-backed image gallery later, it all lives inside the same Cloudflare account with no host switch.
- **Astro framework choice means the case-study repo's own CI is dead simple** — `astro build` outputs a `dist/` Cloudflare Pages picks up automatically, no custom Action needed.

### Negative

- **One-time browser step.** Linking a new repo to Cloudflare Pages requires logging into the Cloudflare dashboard and authorizing the GitHub app once; this cannot be CLI-only on first setup. After the link, every deploy is git-push triggered with no further dashboard touches.
- **Project setup is in a separate repo.** Slight cognitive overhead vs a monorepo, but it keeps the Shopify theme repo focused on the theme.
- **No first-class Vercel-style ISR.** Not needed for a static case study; flagged for revisit if Phase 2 adds dynamic content.

### Neutral

- The Cloudflare account is already provisioned (Day 1 signups). No new account creation required.

## Alternatives considered

- **Vercel** — rejected because the Hobby tier's commercial-use prohibition makes it unsafe for a paid client engagement (even a portfolio one positioned as agency-tier).
- **GitHub Pages** — rejected on no-PR-previews and weaker edge cache; saving 0 dollars relative to Cloudflare Pages is not a reason to pick it.
- **Netlify** — comparable, narrowly lost on bandwidth and the Workers Functions roadmap.
- **Hosting the case study under the storefront's `/pages/case-study` template** — explicitly rejected, because mixing the case study (which talks about the build) into the storefront (which sells products) confuses both audiences and pollutes Shopify analytics.

## Revisit triggers

- If a reviewer requests a custom domain for the case study, the Cloudflare Pages → custom domain path is one DNS record away, no host change needed.
- If Phase 2 adds dynamic content that exceeds the Workers Functions free tier, the migration target would be Cloudflare Workers + R2 still inside the same account.
