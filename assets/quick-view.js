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
    this._requestController = null;
    this._requestGeneration = 0;
    this._uncertainCartVariantIds = new Set();
    this._onDocClick = this._onDocClick.bind(this);
    this._onDialogClick = this._onDialogClick.bind(this);
    this._onClose = this._onClose.bind(this);
    this._onFormSubmit = this._onFormSubmit.bind(this);
    this._onVariantChange = this._onVariantChange.bind(this);
    this._onCartUpdated = this._onCartUpdated.bind(this);
  }

  connectedCallback() {
    this.dialog = this.querySelector('.kg-qv__dialog');
    this.body = this.querySelector('[data-kg-qv-body]');
    document.removeEventListener('click', this._onDocClick);
    document.addEventListener('click', this._onDocClick);
    document.removeEventListener('cart:updated', this._onCartUpdated);
    document.addEventListener('cart:updated', this._onCartUpdated);
    if (this.dialog) {
      this.dialog.removeEventListener('click', this._onDialogClick);
      this.dialog.removeEventListener('close', this._onClose);
      this.dialog.addEventListener('click', this._onDialogClick);
      this.dialog.addEventListener('close', this._onClose);
    }
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('cart:updated', this._onCartUpdated);
    this.dialog?.removeEventListener('click', this._onDialogClick);
    this.dialog?.removeEventListener('close', this._onClose);
    this._requestGeneration += 1;
    this._requestController?.abort();
  }

  _onDocClick(event) {
    const trigger = event.target instanceof Element ? event.target.closest('[data-kg-quick-view]') : null;
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
    this._requestGeneration += 1;
    this._requestController?.abort();
    this._requestController = null;
    this.body.replaceChildren();
    this.currentProduct = null;
  }

  async open(handle) {
    if (!this.dialog || !window.KGClient) return;
    const productUrl = window.KGClient.productPath('products', handle);
    if (!productUrl) return;
    this._requestController?.abort();
    this._requestController = new AbortController();
    const generation = ++this._requestGeneration;
    this.dialog.showModal();
    this.body.innerHTML = `<div class="kg-qv__loading" role="status" aria-live="polite">${this._escape(this._message('loading'))}</div>`;
    try {
      const product = await window.KGClient.requestJSON(`${productUrl}.js`, {
        headers: { Accept: 'application/json' },
        signal: this._requestController.signal,
      });
      if (generation !== this._requestGeneration || !this.isConnected || !this.dialog.open) return;
      if (!product || typeof product.title !== 'string' || !Array.isArray(product.variants) || !product.variants.length || !Array.isArray(product.options)) {
        throw new Error('Product response is incomplete.');
      }
      product.variants = product.variants.filter((variant) => variant && /^\d+$/.test(String(variant.id))
        && Array.isArray(variant.options)).slice(0, window.KGClient.limits.maxProductVariants);
      if (!product.variants.length) throw new Error('Product response is incomplete.');
      this.currentProduct = product;
      this._render(product);
    } catch (err) {
      if (generation !== this._requestGeneration || !this.dialog.open) return;
      this.body.innerHTML = `<p role="alert">${this._escape(this._message('loadError'))}</p>`;
    }
  }

  _render(product) {
    const variant = product.variants.find((v) => v.available) || product.variants[0];
    const hasMultipleVariants = product.variants.length > 1;
    const samplePrice = window.KGClient.config.demoMode
      ? `<small class="kg-demo-price-label">${this._escape(window.KGClient.config.messages.demo.samplePrice)}</small>` : '';

    this.body.innerHTML = `
      <div class="kg-qv__layout">
        <div class="kg-qv__media">
          ${this._imageMarkup(product.featured_image, product.title)}
        </div>
        <div class="kg-qv__content">
          ${product.vendor ? `<p class="text-xs text-muted">${this._escape(product.vendor)}</p>` : ''}
          <h2 id="KgQvTitle" class="h3">${this._escape(product.title)}</h2>
          <p id="KgQvDesc" class="kg-qv__price" data-kg-qv-price>${this._formatPrice(variant)}</p>${samplePrice}
          ${hasMultipleVariants ? this._renderOptions(product, variant) : ''}
          <form class="kg-qv__form" data-kg-qv-form>
            <input type="hidden" name="id" value="${variant.id}" data-kg-qv-id>
            <button type="submit" class="button button--primary button--lg button--block" ${variant.available && !this._uncertainCartVariantIds.has(String(variant.id)) ? '' : 'disabled aria-disabled="true"'}>
              ${this._escape(this._uncertainCartVariantIds.has(String(variant.id))
                ? this._message('cartStatusUnknown')
                : (variant.available ? this._message('addToCart') : this._message('soldOut')))}
            </button>
          </form>
          <p class="kg-qv__more">
            <a href="${this._escape(window.KGClient.productPath('products', product.handle) || '#')}">${this._escape(this._message('viewDetails'))}</a>
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
      const uncertain = this._uncertainCartVariantIds.has(String(match.id));
      submitBtn.disabled = !match.available || uncertain;
      submitBtn.textContent = uncertain ? this._message('cartStatusUnknown') : (match.available ? this._message('addToCart') : this._message('soldOut'));
      if (!match.available || uncertain) submitBtn.setAttribute('aria-disabled', 'true');
      else submitBtn.removeAttribute('aria-disabled');
    }
  }

  async _onFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const id = form.querySelector('[data-kg-qv-id]')?.value;
    if (!submit || !/^\d+$/.test(String(id)) || this._uncertainCartVariantIds.has(String(id))) return;

    submit.disabled = true;
    submit.classList.add('button--loading');
    submit.setAttribute('aria-busy', 'true');

    try {
      const cartAddUrl = window.KGClient.cartRoute('add');
      const cartUrl = window.KGClient.cartRoute('cart');
      if (!cartAddUrl || !cartUrl) throw new Error('Cart route is unavailable.');
      const outcome = await window.KGClient.mutateCart(
        () => window.KGClient.requestJSON(cartAddUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id, quantity: 1 }),
        }),
        () => window.KGClient.requestJSON(cartUrl, { headers: { Accept: 'application/json' } }),
        window.KGClient.isAddedItems,
      );
      if (!outcome.ok) {
        this._uncertainCartVariantIds.add(String(id));
        submit.classList.remove('button--loading');
        submit.removeAttribute('aria-busy');
        submit.disabled = true;
        submit.setAttribute('aria-disabled', 'true');
        submit.textContent = this._message('cartStatusUnknown');
        this._showError(this._message('cartStatusUnknown'));
        if (outcome.reconciled) document.dispatchEvent(new CustomEvent('cart:updated'));
        return;
      }
      document.dispatchEvent(new CustomEvent('cart:updated'));
      submit.classList.remove('button--loading');
      submit.removeAttribute('aria-busy');
      submit.textContent = this._message('added');
      setTimeout(() => this.dialog.close(), window.KGClient.limits.quickViewCloseMs);
    } catch (_err) {
      this._uncertainCartVariantIds.add(String(id));
      submit.classList.remove('button--loading');
      submit.removeAttribute('aria-busy');
      submit.disabled = true;
      submit.setAttribute('aria-disabled', 'true');
      submit.textContent = this._message('cartStatusUnknown');
      this._showError(this._message('cartStatusUnknown'));
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
      const amount = Number(cents);
      if (!Number.isSafeInteger(amount) || amount < 0) return '';
      try {
        return (amount / 100).toLocaleString(undefined, { style: 'currency', currency: window.Shopify?.currency?.active || window.KGClient.config.currency });
      } catch {
        return '';
      }
    };
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      return `<span class="kg-qv__price-now">${fmt(variant.price)}</span> <s class="text-muted">${fmt(variant.compare_at_price)}</s>`;
    }
    return fmt(variant.price);
  }

  _message(key) {
    return window.KGClient?.config?.messages?.quickView?.[key] || '';
  }

  async _onCartUpdated() {
    if (!window.KGClient) return;
    const cartUrl = window.KGClient.cartRoute('cart');
    if (!cartUrl) return;
    try {
      const cart = await window.KGClient.readCart(() => window.KGClient.requestJSON(cartUrl, { headers: { Accept: 'application/json' } }));
      const itemCount = Number(cart?.item_count);
      const element = document.querySelector('[data-cart-count]');
      if (!element || !Number.isSafeInteger(itemCount) || itemCount < 0) return;
      element.textContent = String(itemCount);
      if (itemCount > 0) element.removeAttribute('hidden');
      else element.setAttribute('hidden', '');
    } catch (_error) {
      // Cart count refresh is a best-effort read; never expose cart details in logs.
    }
  }

  _imageMarkup(rawImage, title) {
    const image = window.KGClient.safeUrl(rawImage, { image: true });
    return image
      ? `<img src="${this._escape(image.href)}" alt="${this._escape(title)}" loading="eager" decoding="async">`
      : '';
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
