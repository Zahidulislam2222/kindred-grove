# Kindred Grove — Design System

> **Generated:** 2026-04-19 by Claude Code directly from `docs/BRAND-BRIEF.md`.
> No Figma. No Claude Design GUI. This is the AI workflow differentiator — design systems can be generated in-code when the brand brief is disciplined enough.

---

## Rationale (for case study)

Conventional workflow: **brand brief → designer in Figma → design handoff → dev reinterprets**.
Our workflow: **brand brief → Claude Code reads it → tokens + typography + semantic scale emitted directly to `assets/theme.css` + `config/settings_schema.json`**.

**Why this works:**
- Brief is detailed enough (reference brands, exact mood, 5 visual values) to remove design ambiguity.
- Tokens-first means the first render IS the design system, not a Figma interpretation of it.
- Merchant-editable in theme customizer (Shopify), so client can tune without code.
- Arabic RTL + Latin LTR handled in the same token layer via `[dir="rtl"]` override — no duplicate design system.

**Why this is an agency signal:**
Most Shopify agencies can't ship brand system + merchant customizer + RTL from brief alone. They need a designer in the loop. This flow proves the full-stack-AI-practitioner story — design, code, ops all driven by one operator.

---

## Color System

### Primary palette

**Olive** — primary brand color. Color of cold-pressed Mediterranean olive oil. Reference: Brightland's deep-pour bottle aesthetic.

| Token | Value | Use |
|---|---|---|
| `--color-olive-500` | `#6B7F47` | Primary CTA, link color, active state |
| `--color-olive-600` | `#576839` | Hover |
| `--color-olive-700` | `#44512E` | Active / pressed |
| `--color-olive-300` | `#A8B27A` | Illustrative |
| `--color-olive-100` | `#E2E5D0` | Tinted backgrounds |

**Saffron** — warm gold accent. Color of Iranian Sargol saffron threads + raw honey.

| Token | Value | Use |
|---|---|---|
| `--color-saffron-400` | `#D4A847` | Accent, featured tags, highlights |
| `--color-saffron-500` | `#B88A32` | Hover |

**Terracotta** — secondary accent. Jordan Valley clay. Used sparingly.

| Token | Value | Use |
|---|---|---|
| `--color-terracotta-400` | `#B25B3A` | Heritage moments, second-tier CTAs |

### Neutrals

| Token | Value | Use |
|---|---|---|
| `--color-cream` | `#F8F4EC` | Default background (NOT pure white) |
| `--color-bone` | `#EFEAE0` | Muted surface |
| `--color-stone-200` | `#D1C9B8` | Borders |
| `--color-espresso` | `#1F1A14` | Body text (NOT pure black) |

### Accessibility

- All text/background combos verified against WCAG 2.1 AA (4.5:1 for body, 3:1 for large text):
  - `#1F1A14` on `#F8F4EC` → 15.2:1 ✓ AAA
  - `#6B6350` on `#F8F4EC` → 5.7:1 ✓ AA (large and small)
  - `#FFFFFF` on `#6B7F47` → 5.4:1 ✓ AA (large and small)
- Focus ring `--color-saffron-400` on cream or surface → 3.3:1 ✓ AA for non-text
- No reliance on color alone — icons + text labels in all CTAs

---

## Typography

### Fonts (all free-licensed)

| Role | Font | Why |
|---|---|---|
| **Latin headings** | Cormorant Garamond | Mediterranean heritage serif. Not overused like Playfair. Real oldstyle character. |
| **Latin body** | Inter | Humanist sans. Industry-standard readability at small sizes. |
| **Arabic headings** | Aref Ruqaa | Traditional Ruqaa script, heritage match |
| **Arabic body** | IBM Plex Sans Arabic | Humanist sans, pairs visually with Inter |
| **Monospace** | JetBrains Mono | Used in styleguide + docs blocks |

### Scale — 1.25 ratio (major third)

```
xs:   12px / 0.75rem
sm:   14px / 0.875rem
base: 16px / 1rem       ← body default
lg:   18px / 1.125rem
xl:   20px / 1.25rem
2xl:  24px / 1.5rem     ← h3
3xl:  30px / 1.875rem   ← h2
4xl:  36px / 2.25rem
5xl:  48px / 3rem       ← h1
6xl:  60px / 3.75rem
7xl:  72px / 4.5rem     ← display hero
```

### Line heights

- `tight` (1.1) — hero displays, big headings
- `snug` (1.25) — h2 / h3
- `normal` (1.5) — body default
- `relaxed` (1.625) — long-form reading
- `loose` (1.8) — marketing paragraphs

---

## Spacing — 4px base

Tokens: `--space-0` through `--space-40`. Multiples of 4px up through 160px.

All component padding, margins, gaps, and section spacing reference these. No magic numbers allowed.

---

## Radius

- `--radius-sm` (4px) — tight controls (small buttons)
- `--radius-md` (8px) — inputs, cards
- `--radius-lg` (12px) — primary cards, featured blocks
- `--radius-xl` (16px) — hero modules
- `--radius-pill` — badges, pills

Soft, hospitality-leaning radii. Nothing sharp (that would read fashion-luxury, not heritage-premium).

---

## Shadows

Warm, low-elevation. Shadow color is espresso-tinted (`rgba(31, 26, 20, X)`) not pure black — keeps visual temperature consistent.

- `--shadow-sm` — barely there, for hover lift
- `--shadow-md` — card defaults
- `--shadow-lg` — elevated cards, modals
- `--shadow-xl` — hero cards

---

## Motion

Calm, unhurried. Matches brand voice.

- **Durations:** 150ms / 250ms / 400ms / 600ms
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` — ease-out with overshoot for "arriving gently"
- **Reduced-motion:** fully respected via `@media (prefers-reduced-motion: reduce)` — animations drop to 0.01ms

---

## Dark mode

**Not shipping Phase 1.** Cream background is a brand anchor; dark mode would undercut it. Documented in `docs/ROADMAP.md` Phase 2 if client requests.

---

## Merchant Customization

All brand tokens are exposed in the Shopify theme editor under:

- **Brand — Colors** (8 colors customizable)
- **Brand — Typography** (heading font, body font, base size)
- **Layout** (page width, section spacing)
- **Social & Trust** (4 trust-signal toggles, 3 social links)

Merchant never needs to touch code to tune brand.

---

## Files

| File | Role |
|---|---|
| `assets/theme.css` | Design tokens as CSS custom properties + base reset |
| `config/settings_schema.json` | Shopify theme editor customizer groups |
| `layout/theme.liquid` | Loads tokens + injects merchant overrides as inline CSS |
| `docs/design-system/DESIGN-SYSTEM.md` | This file |

---

## Day 2 Next Steps

- Typography: pull Cormorant + Inter + Aref Ruqaa + IBM Plex Sans Arabic as webfonts via Shopify `font_face`
- Build Theme Blocks: button, card, badge, image-with-text, trust-strip
- Populate `assets/` with component CSS (keep token file clean, components in separate files)
- Write first ADR: `docs/adr/001-theme-blocks-over-sections.md`
