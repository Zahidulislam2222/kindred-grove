/**
 * <kg-wholesale-form> — small browser-side UX checks for the native Shopify
 * wholesale contact form. Honeypot and optional cooldown are bypassable by
 * clients and are not server-side spam controls.
 */
class KindredGroveWholesaleForm extends HTMLElement {
  constructor() {
    super();
    this.lastSubmitAt = null;
    this._onSubmit = this._onSubmit.bind(this);
  }

  connectedCallback() {
    this.form = this.querySelector('[data-kg-form="wholesale"]');
    if (!this.form) return;

    const configuredCooldown = Number(this.getAttribute('data-submit-cooldown-ms'));
    this.cooldownMs = Number.isFinite(configuredCooldown) && configuredCooldown > 0
      ? configuredCooldown
      : null;
    this.cooldownMessage = this.getAttribute('data-submit-cooldown-message') || '';
    this.form.addEventListener('submit', this._onSubmit);
  }

  disconnectedCallback() {
    if (this.form) this.form.removeEventListener('submit', this._onSubmit);
  }

  _showError(message) {
    let box = this.querySelector('.kg-wholesale-form__errors');
    if (!box) {
      box = document.createElement('ul');
      box.className = 'kg-wholesale-form__errors';
      box.setAttribute('role', 'alert');
      this.form.prepend(box);
    }

    const item = document.createElement('li');
    item.textContent = message;
    box.replaceChildren(item);
  }

  _onSubmit(event) {
    const honeypot = this.form.querySelector('input[name="wholesale_website"]');
    if (honeypot && honeypot.value.trim() !== '') {
      event.preventDefault();
      return;
    }

    const now = Date.now();
    if (this.cooldownMs !== null && this.lastSubmitAt !== null) {
      const elapsed = now - this.lastSubmitAt;
      if (elapsed < this.cooldownMs) {
        event.preventDefault();
        const wait = Math.ceil((this.cooldownMs - elapsed) / 1000);
        this._showError(this.cooldownMessage.replace('{seconds}', String(wait)));
        return;
      }
    }

    if (this.cooldownMs !== null) this.lastSubmitAt = now;
  }
}

if (!customElements.get('kg-wholesale-form')) {
  customElements.define('kg-wholesale-form', KindredGroveWholesaleForm);
}
