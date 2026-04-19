/**
 * <kg-quick-view> — modal product quick-view.
 *
 * Listens for clicks on [data-kg-quick-view][data-product-handle] buttons
 * anywhere on the page, fetches /products/{handle}.js (Ajax API), renders
 * image + title + price + options + ATC into a <dialog>, and posts to
 * /cart/add.js when the ATC button is pressed. Fires 'cart:updated' on
 * success; the header listens and updates its live count.
 */
class KindredGroveQuickView extends HTMLElement {
  constructor() {
    super();
    this.dialog = null;
    this.body = null;
    this.currentProduct = null;
    this._onDocClick = this._onDocClick.bind(this);
    this._onDialogClick = this._onDialogClick.bind(this);
    this._onClose = this._onClose.bind(this);
    this._onFormSubmit = this._onFormSubmit.bind(this);
    this._onVariantChange = this._onVariantChange.bind(this);
  }

  connectedCallback() {
    this.dialog = this.querySelector('.kg-qv__dialog');
    this.body = this.querySelector('[data-kg-qv-body]');
    document.addEventListener('click', this._onDocClick);
    if (this.dialog) {
      this.dialog.addEventListener('click', this._onDialogClick);
      this.dialog.addEventListener('close', this._onClose);
    }
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocClick);
  }

  _onDocClick(event) {
    const trigger = event.target.closest('[data-kg-quick-view]');
    if (!trigger) return;
    const handle = trigger.getAttribute('data-product-handle');
    if (!handle) return;
    event.preventDefault();
    this.open(handle);
  }

  _onDialogClick(event) {
    if (event.target.matches('[data-kg-qv-close]')) {
      this.dialog.close();
      return;
    }
    // Click on the backdrop (::backdrop) closes — <dialog> native behavior
    // when target === dialog itself.
    const rect = this.dialog.getBoundingClientRect();
    const clickedInsideDialog =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!clickedInsideDialog) this.dialog.close();
  }

  _onClose() {
    this.body.innerHTML = '<div class="kg-qv__loading" role="status" aria-live="polite">Loading&hellip;</div>';
    this.currentProduct = null;
  }

  async open(handle) {
    if (!this.dialog) return;
    this.dialog.showModal();
    this.body.innerHTML = '<div class="kg-qv__loading" role="status" aria-live="polite">Loading&hellip;</div>';
    try {
      const res = await fetch(`/products/${encodeURIComponent(handle)}.js`, {
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const product = await res.json();
      this.currentProduct = product;
      this._render(product);
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
      this.body.innerHTML = '<p role="alert">Sorry — this product could not be loaded. Please try again.</p>';
    }
  }

  _render(product) {
    const variant = product.variants.find((v) => v.available) || product.variants[0];
    const hasMultipleVariants = product.variants.length > 1;

    this.body.innerHTML = `
      <div class="kg-qv__layout">
        <div class="kg-qv__media">
          <img src="${product.featured_image}" alt="${this._escape(product.title)}" loading="eager" decoding="async">
        </div>
        <div class="kg-qv__content">
          ${product.vendor ? `<p class="text-xs text-muted">${this._escape(product.vendor)}</p>` : ''}
          <h2 id="KgQvTitle" class="h3">${this._escape(product.title)}</h2>
          <p id="KgQvDesc" class="kg-qv__price" data-kg-qv-price>${this._formatPrice(variant)}</p>
          ${hasMultipleVariants ? this._renderOptions(product, variant) : ''}
          <form class="kg-qv__form" data-kg-qv-form>
            <input type="hidden" name="id" value="${variant.id}" data-kg-qv-id>
            <button type="submit" class="button button--primary button--lg button--block" ${variant.available ? '' : 'disabled aria-disabled="true"'}>
              ${variant.available ? 'Add to cart' : 'Sold out'}
            </button>
          </form>
          <p class="kg-qv__more">
            <a href="/products/${product.handle}">View full details</a>
          </p>
        </div>
      </div>
    `;

    const form = this.body.querySelector('[data-kg-qv-form]');
    if (form) form.addEventListener('submit', this._onFormSubmit);

    const optionInputs = this.body.querySelectorAll('[data-kg-qv-option]');
    optionInputs.forEach((el) => el.addEventListener('change', this._onVariantChange));
  }

  _renderOptions(product, selectedVariant) {
    return product.options.map((optionName, idx) => {
      const values = [...new Set(product.variants.map((v) => v.options[idx]))];
      return `
        <fieldset class="kg-qv__option">
          <legend class="h6">${this._escape(optionName)}</legend>
          <div class="cluster">
            ${values.map((val) => `
              <label class="kg-qv__pill">
                <input type="radio" name="option-${idx}" value="${this._escape(val)}" data-kg-qv-option data-option-index="${idx}" ${selectedVariant.options[idx] === val ? 'checked' : ''}>
                <span>${this._escape(val)}</span>
              </label>
            `).join('')}
          </div>
        </fieldset>
      `;
    }).join('');
  }

  _onVariantChange() {
    if (!this.currentProduct) return;
    const selected = Array.from(this.body.querySelectorAll('[data-kg-qv-option]:checked'))
      .map((el) => ({ idx: parseInt(el.getAttribute('data-option-index'), 10), value: el.value }))
      .sort((a, b) => a.idx - b.idx)
      .map((x) => x.value);
    const match = this.currentProduct.variants.find((v) =>
      v.options.every((opt, i) => opt === selected[i])
    );
    if (!match) return;
    const idInput = this.body.querySelector('[data-kg-qv-id]');
    const priceEl = this.body.querySelector('[data-kg-qv-price]');
    const submitBtn = this.body.querySelector('[data-kg-qv-form] button[type="submit"]');
    if (idInput) idInput.value = match.id;
    if (priceEl) priceEl.innerHTML = this._formatPrice(match);
    if (submitBtn) {
      submitBtn.disabled = !match.available;
      submitBtn.textContent = match.available ? 'Add to cart' : 'Sold out';
      if (!match.available) submitBtn.setAttribute('aria-disabled', 'true');
      else submitBtn.removeAttribute('aria-disabled');
    }
  }

  async _onFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const id = form.querySelector('[data-kg-qv-id]').value;

    const originalLabel = submit.textContent;
    submit.disabled = true;
    submit.classList.add('button--loading');
    submit.setAttribute('aria-busy', 'true');

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id, quantity: 1 })
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.description || `Add-to-cart failed (${res.status})`);
      }
      await res.json();
      document.dispatchEvent(new CustomEvent('cart:updated'));
      submit.classList.remove('button--loading');
      submit.textContent = 'Added';
      setTimeout(() => this.dialog.close(), 650);
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
      submit.classList.remove('button--loading');
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = originalLabel;
      this._showError(err.message);
    }
  }

  _showError(message) {
    let errBox = this.body.querySelector('[data-kg-qv-error]');
    if (!errBox) {
      errBox = document.createElement('p');
      errBox.setAttribute('data-kg-qv-error', '');
      errBox.setAttribute('role', 'alert');
      errBox.className = 'kg-qv__error';
      this.body.querySelector('[data-kg-qv-form]')?.insertAdjacentElement('beforebegin', errBox);
    }
    errBox.textContent = message;
  }

  _formatPrice(variant) {
    const fmt = (cents) => {
      try {
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: window.Shopify?.currency?.active || 'USD' });
      } catch {
        return `$${(cents / 100).toFixed(2)}`;
      }
    };
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      return `<span class="kg-qv__price-now">${fmt(variant.price)}</span> <s class="text-muted">${fmt(variant.compare_at_price)}</s>`;
    }
    return fmt(variant.price);
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

if (!customElements.get('kg-quick-view')) {
  customElements.define('kg-quick-view', KindredGroveQuickView);
}

/* Header subscribes to cart:updated and refreshes its count bubble. */
document.addEventListener('cart:updated', async () => {
  try {
    const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const cart = await res.json();
    const el = document.querySelector('[data-cart-count]');
    if (!el) return;
    el.textContent = String(cart.item_count);
    if (cart.item_count > 0) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  } catch (_) { /* non-critical */ }
});
