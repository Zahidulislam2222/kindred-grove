/**
 * <kg-announcement> — dismissible announcement bar.
 *
 * Reads data-dismissible (boolean) and data-dismiss-key (string). When the
 * user clicks the close button, the element is removed from the DOM and the
 * dismiss key is written to localStorage so subsequent page loads keep it
 * hidden. The key is derived from a short hash of the message text in
 * Liquid, so a new message (= new key) re-appears after a previous one was
 * dismissed.
 */
class KindredGroveAnnouncement extends HTMLElement {
  connectedCallback() {
    this.dismissible = this.getAttribute('data-dismissible') === 'true';
    this.dismissKey = this.getAttribute('data-dismiss-key') || '';
    this.closeBtn = this.querySelector('[data-kg-announce-close]');

    if (this.dismissible && this.dismissKey && this._isDismissed()) {
      this.remove();
      return;
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this._dismiss());
    }
  }

  _isDismissed() {
    try {
      return localStorage.getItem(this.dismissKey) === '1';
    } catch (_) {
      return false;
    }
  }

  _dismiss() {
    try {
      localStorage.setItem(this.dismissKey, '1');
    } catch (_) {
      // Privacy mode or storage full — fall through; element still removes.
    }
    this.remove();
  }
}

if (!customElements.get('kg-announcement')) {
  customElements.define('kg-announcement', KindredGroveAnnouncement);
}
