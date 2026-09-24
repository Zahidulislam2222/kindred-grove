# Accessibility checks not established by axe

The Playwright axe suite scans selected routes for automated WCAG 2.2 A/AA rules. It does not establish the following manual checks. Record the browser, assistive technology, route, and outcome when each is performed; unchecked items are not verified.

- [ ] Keyboard-only navigation through header, menus, search, product variant selection, cart drawer, quantity controls, footer country selector, and privacy controls; confirm visible focus and sensible focus return after dialogs close.
- [ ] Screen-reader pass for page title/heading hierarchy, landmarks, product/variant state, cart count and cart updates, form errors/statuses, and native Shopify consent banner labels.
- [ ] Browser zoom at 200% and 400%, plus narrow viewport/reflow, for navigation, product details, cart, and footer controls.
- [ ] Text-spacing override and high-contrast/forced-colors review for focus indicators, disabled demo actions, error/status messages, and controls.
- [ ] Reduced-motion preference for the Grove motion experience and any animated drawers/transitions.
- [ ] Arabic RTL route review for reading order, alignment, focus order, mixed-direction prices/identifiers, and country/privacy controls.
- [ ] Touch-target and mobile screen-reader review on a real mobile browser/device.

Do not submit customer information or complete checkout during these checks. Shopify-hosted consent/account/checkout surfaces require separate platform-level review.
