/**
 * <kg-header> — encapsulates the site header plus its mobile drawer.
 *
 * Exposes two behaviors:
 *   data-kg-drawer-toggle    opens the drawer (also toggles aria-expanded)
 *   data-kg-drawer-close     closes the drawer (panel X button + scrim)
 *
 * Focus trap is the minimal version (tab and shift-tab wrap between first
 * and last focusable descendant of the panel). ESC closes. Body scroll is
 * locked while open. Initial ARIA state is read from the element's hidden
 * attribute so SSR renders correctly.
 */
class KindredGroveHeader extends HTMLElement {
  constructor() {
    super();
    this.drawer = null;
    this.panel = null;
    this.toggles = [];
    this.previouslyFocused = null;
    this._onKeydown = this._onKeydown.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  connectedCallback() {
    this.drawer = this.querySelector('.site-drawer');
    if (!this.drawer) return;
    this.panel = this.drawer.querySelector('.site-drawer__panel');
    this.toggles = Array.from(this.querySelectorAll('[data-kg-drawer-toggle]'));
    this.closers = Array.from(this.querySelectorAll('[data-kg-drawer-close]'));

    this.toggles.forEach(btn => btn.addEventListener('click', this._onClick));
    this.closers.forEach(btn => btn.addEventListener('click', () => this.close()));
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.removeProperty('overflow');
  }

  _onClick() {
    if (this.drawer.hasAttribute('hidden')) this.open();
    else this.close();
  }

  open() {
    if (!this.drawer) return;
    this.previouslyFocused = document.activeElement;
    this.drawer.removeAttribute('hidden');
    this.toggles.forEach(btn => btn.setAttribute('aria-expanded', 'true'));
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKeydown);

    // Focus the close button on open for screen readers.
    const closeBtn = this.drawer.querySelector('.site-drawer__panel [data-kg-drawer-close]');
    if (closeBtn) closeBtn.focus();
  }

  close() {
    if (!this.drawer) return;
    this.drawer.setAttribute('hidden', '');
    this.toggles.forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    document.body.style.removeProperty('overflow');
    document.removeEventListener('keydown', this._onKeydown);
    if (this.previouslyFocused && this.previouslyFocused.focus) this.previouslyFocused.focus();
  }

  _onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab' || !this.panel) return;

    const focusables = this.panel.querySelectorAll(
      'a[href], button:not([disabled]), select, input:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

if (!customElements.get('kg-header')) {
  customElements.define('kg-header', KindredGroveHeader);
}
