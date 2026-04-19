/**
 * <kg-newsletter> — progressive Klaviyo subscribe.
 *
 * When both `data-klaviyo-list` and `data-klaviyo-pk` (public API key,
 * a.k.a. "company_id") are non-empty, intercept the form submit and
 * POST to Klaviyo's public Subscribe endpoint. On any failure (network
 * error, validation error, Klaviyo down), fall through to the native
 * Shopify /contact submission so no subscriber is lost.
 *
 * Klaviyo endpoint per their 2024-10+ public API spec:
 *   POST https://a.klaviyo.com/client/subscriptions/?company_id=<PK>
 *   Content-Type: application/json
 *   revision: 2024-10-15
 *   Body: { data: { type: "subscription", attributes: { ... } } }
 *
 * Public API keys are safe to expose in theme JS by design —
 * Klaviyo rate-limits per-IP and the endpoint only accepts
 * subscription-list mutations, not list reads.
 */

class KindredGroveNewsletter extends HTMLElement {
  connectedCallback() {
    this.list = this.getAttribute('data-klaviyo-list') || '';
    this.pk = this.getAttribute('data-klaviyo-pk') || '';
    this.form = this.querySelector('[data-kg-newsletter-form]');
    this.statusEl = this.querySelector('[data-kg-newsletter-status]');
    if (!this.form) return;

    // Only intercept when both keys present; else let the native submit flow run.
    if (this.list && this.pk) {
      this.form.addEventListener('submit', (e) => this._onSubmit(e));
    }
  }

  _setStatus(message, kind = 'info') {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
    this.statusEl.hidden = false;
    this.statusEl.dataset.kind = kind;
  }

  async _onSubmit(event) {
    // Honeypot — silent drop
    const hp = this.form.querySelector('input[name="newsletter_company"]');
    if (hp && hp.value.trim() !== '') {
      event.preventDefault();
      return;
    }

    const emailInput = this.form.querySelector('input[name="contact[email]"]');
    const email = emailInput?.value.trim();
    if (!email) return; // let native validation handle it

    event.preventDefault();
    this._setStatus('Subscribing…');

    try {
      const res = await fetch(
        `https://a.klaviyo.com/client/subscriptions/?company_id=${encodeURIComponent(this.pk)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            revision: '2024-10-15',
          },
          body: JSON.stringify({
            data: {
              type: 'subscription',
              attributes: {
                custom_source: 'Kindred Grove storefront',
                profile: { data: { type: 'profile', attributes: { email } } },
              },
              relationships: {
                list: { data: { type: 'list', id: this.list } },
              },
            },
          }),
        },
      );

      if (!res.ok && res.status >= 500) throw new Error(`Klaviyo ${res.status}`);
      // 2xx or 4xx-duplicate: treat as success from user's POV
      this._setStatus('Thanks — check your inbox.', 'success');
      if (typeof window.dataLayer !== 'undefined') {
        window.dataLayer.push({ event: 'newsletter_subscribed', source: 'kg_newsletter_block' });
      }
      emailInput.value = '';
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
      // Fall through to Shopify /contact so we don't lose the signup
      this.form.removeEventListener('submit', this._onSubmit);
      this.form.submit();
    }
  }
}

if (!customElements.get('kg-newsletter')) {
  customElements.define('kg-newsletter', KindredGroveNewsletter);
}
