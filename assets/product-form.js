/**
 * PDP form coordinator.
 *
 * <kg-variant-picker> — on option change, match option values to a
 * variant from the embedded JSON, update the hidden variant id, update
 * the selected-value indicator in each legend, and dispatch a
 * 'variant:changed' CustomEvent with the full variant object.
 *
 * <kg-product> — listens for 'variant:changed' and updates the Price
 * block + ATC button label + URL (?variant=...) without a reload.
 *
 * The ATC form itself posts to /cart/add.js via submit handler; fires
 * 'cart:updated' on success. Errors captured to Sentry if loaded.
 */

class KindredGroveVariantPicker extends HTMLElement {
  constructor() {
    super();
    this.variants = [];
    this._onOptionChange = this._onOptionChange.bind(this);
  }

  connectedCallback() {
    const dataEl = this.querySelector('[data-kg-variants]');
    if (dataEl) {
      try { this.variants = JSON.parse(dataEl.textContent); } catch (_) { this.variants = []; }
    }
    this.querySelectorAll('[data-kg-variant-option]').forEach((el) => {
      el.addEventListener('change', this._onOptionChange);
    });
  }

  _onOptionChange() {
    const selected = [];
    this.querySelectorAll('[data-kg-variant-option]:checked').forEach((el) => {
      const pos = parseInt(el.getAttribute('data-option-position'), 10);
      selected[pos - 1] = el.value;
    });

    // Update selected-value indicators next to each legend.
    selected.forEach((val, i) => {
      const indicator = this.querySelector(`[data-kg-option-selected="${i + 1}"]`);
      if (indicator) indicator.textContent = val;
    });

    const match = this.variants.find((v) =>
      v.options.every((opt, i) => opt === selected[i])
    );
    if (!match) return;

    document.dispatchEvent(new CustomEvent('variant:changed', { detail: match }));
  }
}

class KindredGroveProduct extends HTMLElement {
  constructor() {
    super();
    this._onVariantChanged = this._onVariantChanged.bind(this);
    this._onFormSubmit = this._onFormSubmit.bind(this);
  }

  connectedCallback() {
    this.idInput = this.querySelector('[data-kg-variant-id]');
    this.form = this.querySelector('[data-kg-product-form]');
    document.addEventListener('variant:changed', this._onVariantChanged);
    if (this.form) this.form.addEventListener('submit', this._onFormSubmit);
  }

  disconnectedCallback() {
    document.removeEventListener('variant:changed', this._onVariantChanged);
  }

  _onVariantChanged(event) {
    const variant = event.detail;
    if (!variant) return;

    if (this.idInput) this.idInput.value = variant.id;

    // URL sync so copy-paste shares the right variant.
    if (history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      history.replaceState({}, '', url.toString());
    }

    // Price block.
    const amountEl = document.querySelector('[data-kg-price-amount]');
    const compareEl = document.querySelector('[data-kg-price-compare]');
    const atcPrice = document.querySelector('[data-kg-atc-price]');
    const atcBtn = document.querySelector('[data-kg-atc-button]');
    const atcLabel = document.querySelector('.kg-atc__label');
    const statusEl = document.querySelector('[data-kg-price-status]');

    const money = (cents) => {
      try {
        return (cents / 100).toLocaleString(undefined, {
          style: 'currency',
          currency: window.Shopify?.currency?.active || 'USD'
        });
      } catch {
        return `$${(cents / 100).toFixed(2)}`;
      }
    };

    if (amountEl) amountEl.textContent = money(variant.price);
    if (atcPrice) atcPrice.textContent = money(variant.price);

    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.textContent = money(variant.compare_at_price);
        compareEl.removeAttribute('hidden');
      } else {
        compareEl.setAttribute('hidden', '');
      }
    }

    if (atcBtn && atcLabel) {
      atcBtn.disabled = !variant.available;
      if (!variant.available) {
        atcBtn.setAttribute('aria-disabled', 'true');
        atcLabel.textContent = 'Sold out';
      } else {
        atcBtn.removeAttribute('aria-disabled');
        atcLabel.innerHTML = `Add to cart &ndash; <span data-kg-atc-price>${money(variant.price)}</span>`;
      }
    }

    if (statusEl) {
      if (!variant.available) statusEl.removeAttribute('hidden');
      else statusEl.setAttribute('hidden', '');
    }
  }

  async _onFormSubmit(event) {
    event.preventDefault();
    const btn = this.form.querySelector('[data-kg-atc-button]');
    if (btn) {
      btn.classList.add('button--loading');
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
    }

    try {
      const body = new FormData(this.form);
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.description || `Add-to-cart failed (${res.status})`);
      }
      await res.json();
      document.dispatchEvent(new CustomEvent('cart:updated'));

      if (btn) {
        btn.classList.remove('button--loading');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        const label = btn.querySelector('.kg-atc__label');
        if (label) {
          const original = label.innerHTML;
          label.textContent = 'Added';
          setTimeout(() => { label.innerHTML = original; }, 1400);
        }
      }
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
      if (btn) {
        btn.classList.remove('button--loading');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
      this._showError(err.message);
    }
  }

  _showError(message) {
    let errBox = this.querySelector('[data-kg-atc-error]');
    if (!errBox) {
      errBox = document.createElement('p');
      errBox.setAttribute('data-kg-atc-error', '');
      errBox.setAttribute('role', 'alert');
      errBox.className = 'kg-atc__error';
      this.querySelector('[data-kg-atc-button]')?.insertAdjacentElement('beforebegin', errBox);
    }
    errBox.textContent = message;
  }
}

if (!customElements.get('kg-variant-picker')) customElements.define('kg-variant-picker', KindredGroveVariantPicker);
if (!customElements.get('kg-product')) customElements.define('kg-product', KindredGroveProduct);
