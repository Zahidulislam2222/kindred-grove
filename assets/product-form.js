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
 * The ATC form itself uses KGClient's serialized cart-write boundary; native
 * form submission remains available when enhanced configuration is invalid.
 */

class KindredGroveVariantPicker extends HTMLElement {
  constructor() {
    super();
    this.variants = [];
    this._onOptionChange = this._onOptionChange.bind(this);
    this._optionInputs = [];
  }

  connectedCallback() {
    const dataEl = this.querySelector('[data-kg-variants]');
    if (dataEl) {
      try {
        const parsed = JSON.parse(dataEl.dataset.config || 'null');
        this.variants = Array.isArray(parsed) ? parsed.filter((variant) => variant
          && /^\d+$/.test(String(variant.id))
          && Number.isSafeInteger(Number(variant.price)) && Number(variant.price) >= 0
          && Array.isArray(variant.options)) : [];
      } catch (_) { this.variants = []; }
    }
    this._optionInputs = [...this.querySelectorAll('[data-kg-variant-option]')];
    this._optionInputs.forEach((el) => {
      el.addEventListener('change', this._onOptionChange);
    });
  }

  disconnectedCallback() {
    this._optionInputs.forEach((el) => el.removeEventListener('change', this._onOptionChange));
    this._optionInputs = [];
  }

  _onOptionChange() {
    const selected = [];
    this.querySelectorAll('[data-kg-variant-option]:checked').forEach((el) => {
      const pos = parseInt(el.getAttribute('data-option-position'), 10);
      if (Number.isSafeInteger(pos) && pos > 0) selected[pos - 1] = el.value;
    });

    // Update selected-value indicators next to each legend.
    selected.forEach((val, i) => {
      const indicator = this.querySelector(`[data-kg-option-selected="${i + 1}"]`);
      if (indicator) indicator.textContent = val;
    });

    const match = this.variants.find((v) =>
      v.options.length === selected.length && v.options.every((opt, i) => opt === selected[i])
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
    this.submitting = false;
  }

  connectedCallback() {
    this.idInput = this.querySelector('[data-kg-variant-id]');
    this.form = this.querySelector('[data-kg-product-form]');
    document.addEventListener('variant:changed', this._onVariantChanged);
    if (this.form && window.KGClient?.configValid) this.form.addEventListener('submit', this._onFormSubmit);
  }

  disconnectedCallback() {
    document.removeEventListener('variant:changed', this._onVariantChanged);
    if (this.form) this.form.removeEventListener('submit', this._onFormSubmit);
  }

  _onVariantChanged(event) {
    const variant = event.detail;
    if (!window.KGClient?.configValid || !variant || !/^\d+$/.test(String(variant.id))
      || !Number.isSafeInteger(Number(variant.price)) || Number(variant.price) < 0) return;
    this._currentVariant = variant;

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
          currency: window.Shopify?.currency?.active || window.KGClient?.config?.currency
        });
      } catch {
        return '';
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
        atcLabel.textContent = window.KGClient.config.messages.product.soldOut;
      } else {
        atcBtn.removeAttribute('aria-disabled');
        atcLabel.replaceChildren(document.createTextNode(window.KGClient.config.messages.product.addToCart), document.createTextNode(' '));
        const price = document.createElement('span');
        price.setAttribute('data-kg-atc-price', '');
        price.textContent = money(variant.price);
        atcLabel.append(price);
      }
    }

    if (statusEl) {
      if (!variant.available) statusEl.removeAttribute('hidden');
      else statusEl.setAttribute('hidden', '');
    }
  }

  async _onFormSubmit(event) {
    event.preventDefault();
    if (this.submitting || !window.KGClient?.configValid) return;
    const id = this.form.querySelector('[data-kg-variant-id]')?.value;
    if (!/^\d+$/.test(String(id))) return;
    this.submitting = true;
    const btn = this.form.querySelector('[data-kg-atc-button]');
    if (btn) {
      btn.classList.add('button--loading');
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
    }

    try {
      const route = window.KGClient.cartRoute('add');
      if (!route) throw new Error('invalid-config');
      const body = new FormData(this.form);
      const outcome = await window.KGClient.mutateCart(
        () => window.KGClient.requestJSON(route, { method: 'POST', body, headers: { Accept: 'application/json' } }),
        () => window.KGClient.requestJSON(window.KGClient.cartRoute('cart'), { headers: { Accept: 'application/json' } }),
        window.KGClient.isAddedItems,
      );
      if (!outcome.ok) {
        if (outcome.reconciled) document.dispatchEvent(new CustomEvent('cart:updated'));
        this._showError(window.KGClient.config.messages.product.cartStatusUnknown);
        if (btn && !outcome.reconciled) btn.disabled = true;
        return;
      }
      document.dispatchEvent(new CustomEvent('cart:updated'));

      if (btn) {
        btn.classList.remove('button--loading');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        const label = btn.querySelector('.kg-atc__label');
        if (label) {
          const originalLabel = label.cloneNode(true);
          label.textContent = window.KGClient.config.messages.product.added;
          setTimeout(() => {
            if (this.isConnected && label.isConnected
              && this.form.querySelector('[data-kg-variant-id]')?.value === String(id)) label.replaceWith(originalLabel);
          }, window.KGClient.limits.productAddedResetMs);
        }
      }
    } catch (err) {
      if (btn) {
        btn.classList.remove('button--loading');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
      this._showError(window.KGClient?.config?.messages?.product?.cartStatusUnknown || '');
    } finally {
      this.submitting = false;
      btn?.classList.remove('button--loading');
      if (btn && !window.KGClient?.cartWritesBlocked() && !btn.hasAttribute('aria-disabled')) btn.disabled = false;
      btn?.removeAttribute('aria-busy');
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
