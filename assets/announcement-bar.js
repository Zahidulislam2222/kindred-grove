/**
 * <kg-announcement> — dismissible announcement bar.
 *
 * Dismissal is limited to the current page view and is never persisted.
 */
class KindredGroveAnnouncement extends HTMLElement {
  connectedCallback() {
    this.disconnectedCallback();
    this.dismissible = this.getAttribute('data-dismissible') === 'true';
    this.closeBtn = this.querySelector('[data-kg-announce-close]');
    if (this.closeBtn) {
      this._onClose = () => this._dismiss();
      if (this.dismissible) this.closeBtn.addEventListener('click', this._onClose);
    }
  }

  disconnectedCallback() {
    if (this.closeBtn && this._onClose) this.closeBtn.removeEventListener('click', this._onClose);
    this.closeBtn = null;
    this._onClose = null;
  }

  _dismiss() {
    this.remove();
  }
}

if (!customElements.get('kg-announcement')) {
  customElements.define('kg-announcement', KindredGroveAnnouncement);
}
