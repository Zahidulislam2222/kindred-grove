# Accessibility — Kindred Grove

Last reviewed: 2026-09-24. Engineering target: **WCAG 2.2 AA**. Phase 2 is accepted for the reviewed development artifact; automated checks are not a complete accessibility assessment or legal certificate.

## Verified development evidence

The final integrated browser run passed 41 cases with zero failures, five documented skips and no flaky results. Its axe checks passed on home, cart, collection and search. Separate active alternate Quiz and Wholesale template checks passed 2/2 with zero violations. The quiz progressbar was visible and its accessible name matched the rendered heading; all five questions, the result link and reset after reload were exercised. Canonical Quiz/Wholesale pages are absent; the Quiz test explicitly enabled its feature after native consent.

Direction-aware header reveal on focus/menu use, keyboard/Escape/focus return, synchronized video/copy and reduced motion were exercised. No-JavaScript navigation passed at 320/390 px. Product reflow passed at 320/370/371/390/1440 px, including the sample-price label and media. The country-selector contrast defect and unnamed quiz progressbar were corrected and checked on the uploaded artifact. Local/frozen/downloaded theme parity is 150/150.

Earlier desktop/mobile visual checks covered 1440/390 px. A 200% root-font-size experiment was only an approximation; it does not establish browser zoom conformance. Automated keyboard checks cover named interactions, not every possible journey or assistive technology.

## Automated scope and exclusions

`tests/a11y/axe.spec.ts` uses WCAG 2.0, 2.1 and 2.2 A/AA tags and asserts no violations on the four base routes. It excludes these platform/app selectors:

| Selector | Excluded scope |
|---|---|
| `[id^="PBar"]` | Shopify preview/promotional bar |
| `[class^="_GrabberButton"]` | Injected consent control |
| `#shopify-section-shopify` | Shopify app-injected section wrapper |

Excluded markup still matters to the visitor and requires separate review; these exclusions do not establish platform accessibility. Shopify-hosted account/checkout surfaces are also outside the theme scan. Native consent choices were functionally exercised, which is different from a full accessibility audit of that interface.

The accessibility workflow is manual and requires configured preview credentials; missing prerequisites fail preflight. Hosted execution and required merge checks have not been verified. There is no current claim that axe runs on every PR.

## Remaining manual checks

The maintained [manual checklist](../tests/a11y/MANUAL-CHECKS.md) records checks not established by axe: screen readers, actual 200%/400% browser zoom, text spacing, forced colors, complete keyboard paths, Arabic RTL, touch targets and real-device mobile assistive technology. Its unchecked boxes remain unverified. Single-variant catalog and missing article/merchant pages limit route coverage.

The current homepage includes a film with pause/reduced-motion behavior. Evaluate media alternatives against its actual content before changing footage; neither an obsolete “no video” statement nor a passing automated scan settles that review. No real order or customer-information submission is needed for accessibility testing.

## Maintenance

Reproduce a finding on the intended development artifact, preserve a redacted report, fix local source, run the relevant checks, then verify deployed parity and behavior. Do not broaden exclusions to hide a theme defect. Record escaped defects in [DEFECT-LOG.md](../DEFECT-LOG.md). Commercial applicability and platform dependencies remain in [the requirements register](COMPLIANCE-RESEARCH.md).
