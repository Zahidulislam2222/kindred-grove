# Accessibility — Kindred Grove

Last updated: 2026-04-19 (Day 15)

Target: **WCAG 2.1 AA, 0 violations** on every PR.
Verified in CI by `@axe-core/playwright` across four routes (home, cart, collection, search). Every violation merge-blocks. See `docs/TESTING.md` §4 for the scan configuration.

This document records the posture: what we test, what's manual, what our design tokens enforce, and where each control lives in the codebase.

---

## 1. Commitment

- **Standard:** WCAG 2.1 Level AA (the same tier Shopify's own Polaris and Horizon themes target).
- **Scope:** every theme-owned surface. Third-party injected markup (cookie-consent banners, preview-bar iframes) is excluded from scans with a code comment documenting why; those are the app vendor's responsibility.
- **Measurement:** automated in CI. Manual testing checkpoints on Day 15 + before Phase 1 ship (screen reader + keyboard-only walkthrough of the full purchase funnel).

---

## 2. Color contrast (WCAG 1.4.3)

Our brand olive sits right on the edge of the AA threshold, so we keep two olive shades in the palette — the regular `#6B7F47` for large surfaces, the deeper `#576839` (`--color-primary-hover`) for small text:

| Surface | Foreground | Background | Ratio | Pass |
|---|---|---|---|---|
| `.eyebrow` | `#576839` | `#F8F4EC` | 5.76:1 | ✅ AA normal text |
| `.button--primary` text | `#FFFFFF` | `#576839` | 6.26:1 | ✅ AA normal |
| `.product-card__price` | `#576839` | `#F8F4EC` | 5.76:1 | ✅ |
| `.search__price` | `#576839` | `#F8F4EC` | 5.76:1 | ✅ |
| Body text | `#1F1A14` (espresso) | `#F8F4EC` (cream) | 14.56:1 | ✅ AAA |
| `.text-muted` | `#6B6350` (stone-500) | `#F8F4EC` | 5.10:1 | ✅ AA |
| Hero overlay text | `#F8F4EC` | `#1F1A14` (dark overlay) | 14.56:1 | ✅ AAA |
| `.kg-hero--text-light .eyebrow` | `#D4A847` (saffron) | `#1F1A14` | 9.18:1 | ✅ AAA |

**Implementation detail:** every small-text primary surface uses the double-declaration pattern so axe's color computation never falls through to an invalid `var()`:

```css
.eyebrow {
  color: #576839;                              /* hardcoded fallback */
  color: var(--color-primary-hover, #576839);  /* merchant override path */
}
```

The first declaration is what axe sees if the var chain fails; the second is the merchant-customizable path. Both resolve to the same color in the default palette.

---

## 3. Semantic markup + ARIA

- **Headings:** enforced hierarchy — one `<h1>` per page (PDP title, homepage hero, page title). Blocks emit `<h2>` / `<h3>` and the merchant can downgrade via `element` settings.
- **Landmarks:** every page has `<header>` (`site-header`), `<main>` (id `main`, target of the skip link), `<footer>`. Modal dialogs (cart drawer, quick-view) use `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- **Nav:** footer social links use `<nav aria-label="Follow us">` (not a `<div aria-label="...">` — `aria-label` is prohibited on divs without a role). Breadcrumb uses `<nav aria-label="Breadcrumb">`.
- **Icon-only buttons:** always carry `aria-label` — cart icon, search icon, menu toggle, quick-view close.
- **Review stars:** `<div class="kg-reviews__stars" role="img" aria-label="5 out of 5 stars">`. `role="img"` makes `aria-label` valid per axe's `aria-prohibited-attr` rule.
- **Live regions:** cart subtotal (`aria-live="polite"`), free-ship progress bar (`aria-live="polite"`), gift-note save status (`aria-live="polite"`).

---

## 4. Keyboard navigation

- **Skip link** (`.skip-link`, line 1 of `<body>`) jumps to `#main`. Visible on `:focus` with `transform: translateY(0)`.
- **Focus-visible:** `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; border-radius: var(--radius-sm); }` — saffron outline, never removed.
- **Tab order:** matches visual order on every page. Dialog components implement focus traps (cart drawer, quick-view, quiz stage).
- **Escape:** closes every modal (cart drawer, quick-view, predictive search dropdown).
- **Arrow keys:** navigate predictive-search results, quiz option cards.
- **Enter:** submits forms, follows highlighted search result.

---

## 5. Forms

- Every `<input>`, `<textarea>`, `<select>` has a visible `<label>` tied by `for` / `id`.
- `required` fields carry `required aria-required="true"`.
- Errors render `role="alert"` and the field gets `aria-invalid="true"` + `aria-describedby` pointing at the error paragraph.
- Submit buttons never become ambiguous-disabled — they show a loading state (`aria-busy="true"`) not a raw `disabled` during the request.
- Honeypot fields (wholesale, newsletter) use `aria-hidden="true"` + `tabindex="-1"` so they're invisible to assistive tech.

---

## 6. Images + media

- Every `<img>` in theme code uses `snippets/image.liquid` which requires an `alt` argument (empty for decorative, meaningful for content). The snippet adds explicit `width` + `height` to prevent CLS.
- Hero images carry `fetchpriority="high"`; below-fold images get `loading="lazy"`.
- 3D model-viewer fallback: `<model-viewer>` declares `alt="3D model of [product]"` and the `<noscript>` fallback is a plain `<img>` with the same alt.

---

## 7. RTL support

- The whole stylesheet uses logical properties: `padding-inline`, `margin-block`, `border-inline-start`, etc. No `margin-left` / `padding-right` anywhere in theme code (grep-enforced via a theme-check custom rule planned for Day 17).
- `<html dir="{{ 'rtl-language'... }}">` switches direction based on the active locale.
- Arabic locale file lands on Day 17. RTL CSS smoke-tested in Percy at `ar` locale before ship.

---

## 8. Motion

- `@media (prefers-reduced-motion: reduce)` block in `assets/theme.css:285` zeroes out all `animation-duration` and `transition-duration`. Applies to:
  - Hero fade-in
  - Cart drawer slide
  - Button hover transitions
  - Model-viewer reveal
- Auto-scrolling carousels (Instagram strip, reviews-carousel) pause on `prefers-reduced-motion`.

---

## 9. Documented exclusions

The only elements excluded from axe scans, and why:

| Selector | Why | Who owns |
|---|---|---|
| `[id^="PBar"]` | Shopify preview bar iframe — dev-store only, not rendered in production | Shopify |
| `[class^="_GrabberButton"]` | Cookie-consent Polaris web component injected by Shopify's customer-privacy script | Shopify |
| `#shopify-section-shopify` | Shopify-app-injected section wrapper (Judge.me widget, etc.) | Third-party apps |

We re-audit this list every quarter. If Shopify ships a fix, the exclusion comes off.

---

## 10. What's automated vs manual

**Automated (every PR):**
- axe-core WCAG 2.1 AA scan on 4 routes
- Color contrast (via axe's `color-contrast` rule)
- Heading hierarchy (`heading-order`)
- Image alt presence (`image-alt`)
- Form label association (`label`, `form-field-multiple-labels`)
- ARIA validity (`aria-valid-attr-value`, `aria-prohibited-attr`, `aria-required-children`)
- Landmark uniqueness (`landmark-unique`)
- Link name presence (`link-name`)

**Manual (Day 15 checkpoint + pre-ship):**
- Screen-reader walkthrough: VoiceOver on macOS + NVDA on Windows, full purchase funnel
- Keyboard-only: no mouse, complete a real order flow
- Zoom: 200% + 400% layouts still usable
- Forced-colors (Windows High Contrast Mode): interactive controls still distinguishable

---

## 11. Known limitations (Phase 1)

- **No skip-to-footer link** — the spec allows skip-to-main only. If customer support asks, we can add a second skip target on Day 20.
- **No audio/video content yet** — captions/transcripts are not a Phase 1 requirement. When the merchant adds hero video in Phase 2, they'll need to provide a `<track kind="captions">`; the `blocks/model-viewer.liquid` block already reserves the API hook.
- **Locale switcher** is a native `<select>`, not an `aria-expanded` combobox. The plain form-submit pattern is more reliable for screen readers than a custom dropdown.

---

## 12. If you find a violation

1. Open `test-results/a11y-...` artifact from the failing CI run; the axe JSON has the exact selector + rule ID.
2. Link the axe rule doc — `https://dequeuniversity.com/rules/axe/4.11/<rule-id>`.
3. Fix the source markup. Never add a new entry to `thirdPartyExcludes` without a code comment citing the third-party origin.
4. Re-push. The a11y workflow runs again on the push.

Zero-violation is the contract. Exceptions need a code review comment explaining why, tied to a fix ticket.
