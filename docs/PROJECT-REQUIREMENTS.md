# Project requirements and commercial-readiness roadmap

Updated: 2026-10-08. This is the cross-functional requirements map for the current Shopify storefront and future commercial operation. It separates delivered capabilities from work that needs business facts, qualification or operating ownership. Detailed legal triggers remain in the [requirements register](COMPLIANCE-RESEARCH.md).

## Current delivery and future objectives

The theme and seven native content pages are published. Reviewers enter the separately shared storefront password; it is never published in Git. Shopify owns the backend, hosted cart, catalog and checkout. The current app-development store restricts production transactions and password removal. The user accepts password-based sharing for the present delivery.

Future engineering objectives are 1M+ simultaneous visitors and 99% rolling availability. Qualification requires a representative workload, platform-specific agreement and measured operations; stage gates are in [capacity](SCALABILITY.md) and [operations](OPERATIONS.md). Documentation authorizes design work, not resource purchases or public load generation.

| Area | Required outcome | Present state | Accountable role / exit evidence |
|---|---|---|---|
| Storefront pages | Shared navigation, coherent product discovery, seven content pages, search and cart | Published and authenticated-browser verified | Technical maintainer; regressions, responsive/manual accessibility and native resource readback |
| Backend | Explicit ownership, safe failure behavior, no public Admin credential or custom checkout dependency | Shopify-managed; inactive historical integration source preserved | Technical maintainer; [service contracts](BACKEND.md), scan and real-flow results |
| Business identity | Truthful trader identity, support channels, operator locations and fulfillment model | Merchant facts not verified | Merchant; approved business profile and working contact channels |
| Product accuracy | Ingredient/allergen/nutrition/quantity/origin evidence for every SKU and market | Product records render; provenance and label evidence open | Merchant/product specialist; SKU×market field review and supplier records |
| Commerce eligibility | Eligible production store, configured payments, taxes, shipping, returns and account behavior | Current development store restricts real transactions | Merchant; approved migration and verified platform/provider readiness |
| Customer support | Inbox ownership, inquiry response, returns/refunds and escalation | Native controls inspected; delivery and support operations open | Support owner; controlled lawful delivery test, response procedure and escalation contacts |
| Privacy | Processing map, truthful notice, purpose controls, rights intake, retention and vendor terms | Theme consent/storage controls tested; whole-platform/vendor process partial | Privacy owner; data map and rehearsed request across actual systems |
| Security | Least privilege, MFA/recovery, secret management, safe rendering, meaningful scan/review | Theme controls/scans evidenced; merchant operations require review | Security/technical owner; [security register](SECURITY.md), recovery and incident rehearsal |
| Accessibility | WCAG 2.2AA target, keyboard, reflow, motion alternatives and usable forms | Automated checks and selected manual behavior passed | Accessibility owner; complete assistive-technology and zoom review plus issue closure |
| Performance | Representative browser traces, media loading decisions and measured field results | Responsive functionality verified; full field baseline open | Frontend owner; route/device/network baseline and before/after measurements |
| Peak scale | Qualified10k→100k→1M+ workload and event operation | Configurable demand model; no platform peak measurement | Capacity owner and Shopify; approved ramp/soak/failure tests and store-specific guidance |
| Reliability | 99% per-path objective, observation coverage, alerts and owned response | Operating design documented; continuous measurement not deployed | Service owner; monitoring/alert delivery, response hours and recorded rolling window |
| Recovery | Restore exact theme artifact safely and resume interrupted changes | Snapshots/manifests available; timed restore rehearsal open | Release owner; measured restore, hash parity and browser smoke results |
| Delivery | Reviewed branch, safe publication, current documentation and protected-main approval | Source delivered through existing PR; approving review required | Repository maintainer; exact head/checks, reviewer result and approved transition |
| Cost control | Priced provider changes, authorized operating budget and spending alerts | No new service activated in this publication | Merchant; explicit amount, recurring/one-time classification and approval before spend |

## Legal and policy work by market

Complete a jurisdiction/product applicability decision before enabling commercial operation. Website language, a currency selector or a Shopify market entry does not establish compliance. The merchant's operating country is a separate fact to establish; this register does not assume it from the developer's location.

| Market / activity | Required investigation | Source and evidence owner |
|---|---|---|
| United States | Applicable state privacy/health-data/breach duties; federal/state advertising, truthful origin/reviews and email rules; food labels/allergens/claims; tax nexus and shipping/refund promises | [FTC business guidance](https://www.ftc.gov/business-guidance), [FDA food guidance](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods), state regulators; merchant and qualified specialists |
| Canada | PIPEDA and applicable provincial privacy law; CASL for commercial electronic messages; food label/allergen/bilingual/import duties; provincial consumer and tax obligations | [OPC/PIPEDA](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/), [CASL](https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en), [CFIA labeling](https://inspection.canada.ca/en/food-labels/labelling/industry); merchant/privacy/product owners |
| EU/EEA | GDPR/ePrivacy roles, notices, rights and transfers; consumer-contract/withdrawal/price rules; food information; VAT/import and accessibility applicability; national green-claim rules | [EU data protection](https://commission.europa.eu/law/law-topic/data-protection/legal-framework-eu-data-protection_en), [sustainable consumption](https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/sustainable-consumption_en); country-specific decisions in the detailed register |
| Any new country | Seller/importer identity, licensing, product rules, privacy, consumer contracts, tax, language, fulfillment and sanctions/trade restrictions where relevant | Open a fresh official-source applicability record before activating the market |
| Card payments | Keep card handling in approved hosted checkout; confirm merchant/acquirer PCI obligations and app/script responsibilities | [Shopify PCI information](https://www.shopify.com/security/pci-compliant), [PCI merchant resources](https://www.pcisecuritystandards.org/merchants/); merchant/payment owner |
| Media/brand/content | Code license is separate from image/video/font/music/trademark permission and factual provenance | [Media register](MEDIA-PROVENANCE.md); content-rights owner supplies licenses/releases and territorial scope |

For each triggered duty, keep the official source and check date, decision facts, responsible role, approved policy/control, supporting test/evidence and next review. Public records summarize decisions; customer, business-confidential and access material stays private. A policy document needs actual intake and response operations to be effective.

## Commercial launch decision

1. Merchant approves actual identity, product evidence, supported markets and fulfillment/support facts.
2. Platform confirms an eligible production setup; migration and paid choices receive separate explicit authorization.
3. Privacy, legal, payment, tax, accessibility and vendor owners close triggered requirements with evidence.
4. Technical team freezes the artifact, runs applicable source/security/browser checks, obtains independent review and verifies drift/parity.
5. Operator confirms measurement, response coverage, tested rollback, recovery ownership and customer communications.
6. Merchant approves the concrete release; fresh anonymous and actual authorized commerce flows are verified afterward.

Password-based project review is the accepted current access model. It does not require a frontend rewrite and does not close the future commercial-launch gates.

## Ongoing maintenance

Before a release, verify dependency alerts, tests, privacy/app changes, local/remote drift, artifact identity and rollback. Monthly, review supported versions, permissions, observation coverage, unresolved defects and media performance. Quarterly, review market/legal applicability, vendors, retention, product claims and recovery ownership. Rehearse restoration before a significant campaign and after material architecture changes. Security incidents or critical dependency advisories trigger immediate review according to severity.

These are proposed operating cadences to assign to named owners before launch. Every future milestone closes with actual evidence and a dated result, not solely with a written plan.
