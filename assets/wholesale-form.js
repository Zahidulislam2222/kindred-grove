/**
 * <kg-wholesale-form> — client-side hardening for the B2B inquiry form.
 *
 * Responsibilities:
 *  - Honeypot check: if the hidden `wholesale_website` field is non-empty,
 *    abort the submit entirely (naive bot filter).
 *  - Rate limit: block submissions faster than `data-min-submit-interval`
 *    milliseconds after the previous one. Persisted in sessionStorage so
 *    the cooldown survives tab reload within the session.
 *  - Optional worker proxy: when `data-worker-url` is set, the form POSTs
 *    a JSON payload to that URL first (for Admin-API draft-order creation)
 *    and only falls through to the native /contact submission if the
 *    worker returns 2xx. Keeps no-JS + Shopify-native submission paths
 *    intact.
 *
 * All errors surface in the form's existing error container; nothing is
 * thrown — a failed worker call still allows the inquiry to be captured.
 */

class KindredGroveWholesaleForm extends HTMLElement {
  constructor() {
    super();
    this._onSubmit = this._onSubmit.bind(this);
  }

  connectedCallback() {
    this.form = this.querySelector('[data-kg-form="wholesale"]');
    if (!this.form) return;
    this.workerUrl = this.getAttribute('data-worker-url') || '';
    this.minInterval = parseInt(this.getAttribute('data-min-submit-interval'), 10) || 8000;
    this.form.addEventListener('submit', this._onSubmit);
  }

  _lastSubmitAt() {
    const v = sessionStorage.getItem('kg-wholesale-last-submit');
    return v ? parseInt(v, 10) : 0;
  }

  _markSubmitted() {
    sessionStorage.setItem('kg-wholesale-last-submit', Date.now().toString());
  }

  _showError(message) {
    let box = this.querySelector('.kg-wholesale-form__errors');
    if (!box) {
      box = document.createElement('ul');
      box.className = 'kg-wholesale-form__errors';
      box.setAttribute('role', 'alert');
      this.form.prepend(box);
    }
    box.innerHTML = `<li>${message}</li>`;
  }

  async _onSubmit(event) {
    // Honeypot
    const hp = this.form.querySelector('input[name="wholesale_website"]');
    if (hp && hp.value.trim() !== '') {
      event.preventDefault();
      return; // silent reject
    }

    // Rate limit
    const elapsed = Date.now() - this._lastSubmitAt();
    if (elapsed < this.minInterval) {
      event.preventDefault();
      const wait = Math.ceil((this.minInterval - elapsed) / 1000);
      this._showError(`Please wait ${wait} more second${wait === 1 ? '' : 's'} before resubmitting.`);
      return;
    }

    // Worker proxy (optional)
    if (this.workerUrl) {
      event.preventDefault();
      try {
        const body = Object.fromEntries(new FormData(this.form));
        const res = await fetch(this.workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Worker returned ${res.status}`);
        this._markSubmitted();
        // Fall through to native /contact submit so the merchant's inbox
        // still gets the inquiry (worker handles draft order separately).
        this.form.removeEventListener('submit', this._onSubmit);
        this.form.submit();
      } catch (err) {
        if (window.Sentry) window.Sentry.captureException(err);
        // Don't block the user — allow native /contact fallback.
        this._markSubmitted();
        this.form.removeEventListener('submit', this._onSubmit);
        this.form.submit();
      }
      return;
    }

    // No worker — native /contact submit, just mark the timestamp.
    this._markSubmitted();
  }
}

if (!customElements.get('kg-wholesale-form')) {
  customElements.define('kg-wholesale-form', KindredGroveWholesaleForm);
}
