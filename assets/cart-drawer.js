/**
 * <kg-cart-drawer> — slide-in cart drawer.
 *
 * Opens on:
 *   - Click of [data-kg-cart-open] anywhere on the page (intercepts nav to /cart)
 *   - Dispatch of CustomEvent('cart:open') (other JS can request opening)
 *   - Dispatch of CustomEvent('cart:updated') after any ATC (auto-opens + refreshes)
 *
 * Closes on:
 *   - Click of [data-kg-cart-close] (X button + scrim)
 *   - ESC keydown
 *   - Submit of the checkout form (native nav to /cart)
 *
 * Cart mutations:
 *   - Qty +/- buttons → /cart/change.js
 *   - Remove button → /cart/change.js qty=0
 *   - Upsell Add → /cart/add.js
 *   - Gift note typing → /cart/update.js (configured debounce)
 *
 * After any mutation, dispatches 'cart:updated' so other listeners (header
 * count bubble in quick-view.js) also refresh. Does a single /cart.js fetch
 * to re-render its own state.
 *
 * A11y: focus trap, ESC, restores focus on close, body scroll lock, aria-live
 * on counts + free-ship message.
 */
class KindredGroveCartDrawer extends HTMLElement {
  constructor() {
    super();
    this.drawer = null;
    this.panel = null;
    this.body = null;
    this.isOpen = false;
    this.previouslyFocused = null;
    this.noteTimer = null;
    this.pendingChanges = new Set();
    this._onDocClick = this._onDocClick.bind(this);
    this._onCartUpdated = this._onCartUpdated.bind(this);
    this._onCartOpen = this._onCartOpen.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
    this._onDrawerClick = this._onDrawerClick.bind(this);
    this._onDrawerInput = this._onDrawerInput.bind(this);
    this._onDrawerChange = this._onDrawerChange.bind(this);
  }

  connectedCallback() {
    if (!window.KGClient?.configValid) return;
    this.drawer = this.querySelector('.kg-cart__drawer');
    this.panel = this.querySelector('.kg-cart__panel');
    this.body = this.querySelector('[data-kg-cart-body]');
    if (!this.drawer || !this.panel) return;

    document.addEventListener('click', this._onDocClick);
    document.addEventListener('cart:updated', this._onCartUpdated);
    document.addEventListener('cart:open', this._onCartOpen);

    this.drawer.addEventListener('click', this._onDrawerClick);
    this.drawer.addEventListener('input', this._onDrawerInput);
    this.drawer.addEventListener('change', this._onDrawerChange);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('cart:updated', this._onCartUpdated);
    document.removeEventListener('cart:open', this._onCartOpen);
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.removeProperty('overflow');
    clearTimeout(this.noteTimer);
    this.drawer?.removeEventListener('click', this._onDrawerClick);
    this.drawer?.removeEventListener('input', this._onDrawerInput);
    this.drawer?.removeEventListener('change', this._onDrawerChange);
  }

  /* ----- open/close ----- */

  _onDocClick(event) {
    const trigger = event.target.closest('[data-kg-cart-open]');
    if (!trigger) return;
    event.preventDefault();
    this.open();
  }

  _onCartOpen() { this.open(); }

  async _onCartUpdated() {
    await this.refresh();
    if (!this.isOpen) this.open();
  }

  open() {
    if (!this.drawer || this.isOpen) return;
    this.isOpen = true;
    this.previouslyFocused = document.activeElement;
    this.drawer.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onKeydown);

    const closeBtn = this.querySelector('[data-kg-cart-close]');
    if (closeBtn) closeBtn.focus();

    this.refresh();
  }

  close() {
    if (!this.drawer || !this.isOpen) return;
    this.isOpen = false;
    this.drawer.setAttribute('hidden', '');
    document.body.style.removeProperty('overflow');
    document.removeEventListener('keydown', this._onKeydown);
    if (this.previouslyFocused && this.previouslyFocused.focus) {
      this.previouslyFocused.focus();
    }
  }

  _onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab' || !this.panel) return;

    const focusables = this.panel.querySelectorAll(
      'a[href], button:not([disabled]), select, input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  /* ----- delegated drawer events ----- */

  _onDrawerClick(event) {
    if (event.target.closest('[data-kg-cart-close]')) {
      this.close();
      return;
    }

    const dec = event.target.closest('[data-kg-qty-decrement]');
    const inc = event.target.closest('[data-kg-qty-increment]');
    const rm = event.target.closest('[data-kg-cart-remove]');
    const upsellBtn = event.target.closest('[data-kg-cart-upsell-add]');

    if (dec) {
      const key = dec.getAttribute('data-line-key');
      this._changeQty(key, -1);
    } else if (inc) {
      const key = inc.getAttribute('data-line-key');
      this._changeQty(key, +1);
    } else if (rm) {
      const key = rm.getAttribute('data-line-key');
      this._setQty(key, 0);
    } else if (upsellBtn) {
      const id = upsellBtn.getAttribute('data-variant-id');
      if (id) this._upsellAdd(id, upsellBtn);
    }
  }

  _onDrawerInput(event) {
    if (event.target.matches('[data-kg-cart-note]')) {
      this._queueNoteSave(event.target.value);
    }
  }

  _onDrawerChange(event) {
    if (event.target.matches('[data-kg-qty-input]')) {
      const key = event.target.getAttribute('data-line-key');
      const qty = Math.max(0, parseInt(event.target.value, 10) || 0);
      this._setQty(key, qty);
    }
  }

  /* ----- cart mutations ----- */

  _changeQty(key, delta) {
    if (typeof key !== 'string' || !key || ![-1, 1].includes(delta)) return;
    const input = [...this.querySelectorAll('[data-kg-qty-input]')]
      .find((candidate) => candidate.getAttribute('data-line-key') === key);
    const current = input ? parseInt(input.value, 10) : 1;
    const next = Math.max(0, current + delta);
    this._setQty(key, next);
  }

  async _setQty(key, qty) {
    if (typeof key !== 'string' || !key || !Number.isSafeInteger(qty) || qty < 0 || this.pendingChanges.has(key)) return;
    this.pendingChanges.add(key);
    try {
      const outcome = await this._mutate('change', { id: key, quantity: qty });
      if (outcome.ok) document.dispatchEvent(new CustomEvent('cart:updated'));
      else {
        if (outcome.reconciled) this._applyCart(outcome.cart);
        this._showCartStatus(this._t('statusUnknown'));
        if (!outcome.reconciled) this._disableCartWrites();
      }
    } finally {
      this.pendingChanges.delete(key);
    }
  }

  async _upsellAdd(variantId, button) {
    if (!/^\d+$/.test(String(variantId))) return;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      const outcome = await this._mutate('add', { id: Number(variantId), quantity: 1 });
      if (outcome.ok) {
        button.textContent = this._t('added');
        document.dispatchEvent(new CustomEvent('cart:updated'));
      } else {
        if (outcome.reconciled) this._applyCart(outcome.cart);
        button.textContent = this._t('statusUnknown');
        this._showCartStatus(this._t('statusUnknown'));
        if (!outcome.reconciled) this._disableCartWrites();
      }
    } finally {
      button.removeAttribute('aria-busy');
      if (!window.KGClient.cartWritesBlocked()) button.disabled = false;
    }
  }

  _queueNoteSave(value) {
    const status = this.querySelector('[data-kg-cart-note-status]');
    if (status) status.textContent = this._t('noteSaving');
    clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => this._saveNote(value), window.KGClient.limits.cartNoteDebounceMs);
  }

  async _saveNote(note) {
    const status = this.querySelector('[data-kg-cart-note-status]');
    try {
      const outcome = await this._mutate('update', { note: String(note).slice(0, 500) });
      if (outcome.ok) {
        if (status) status.textContent = this._t('noteSaved');
      } else {
        if (outcome.reconciled) this._applyCart(outcome.cart);
        if (status) status.textContent = this._t('statusUnknown');
        if (!outcome.reconciled) this._disableCartWrites();
      }
    } catch (_error) {
      if (status) status.textContent = this._t('statusError');
    }
  }

  /* ----- refresh render ----- */

  async refresh() {
    try {
      const route = window.KGClient.cartRoute('cart');
      if (!route) return;
      const cart = await window.KGClient.readCart(() => window.KGClient.requestJSON(route, { headers: { Accept: 'application/json' } }));
      this._applyCart(cart);
      this._enableCartWrites();
    } catch (_error) {
      this._showCartStatus(this._t('statusError'));
    }
  }

  async _mutate(routeName, body) {
    const route = window.KGClient.cartRoute(routeName);
    const cartRoute = window.KGClient.cartRoute('cart');
    if (!route || !cartRoute) return { ok: false, reconciled: false, blocked: true };
    return window.KGClient.mutateCart(
      () => window.KGClient.requestJSON(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      }),
      () => window.KGClient.requestJSON(cartRoute, { headers: { Accept: 'application/json' } }),
      routeName === 'add' ? window.KGClient.isAddedItems : window.KGClient.isCartSnapshot,
    );
  }

  _applyCart(cart) {
    if (!cart || !Array.isArray(cart.items) || !Number.isSafeInteger(Number(cart.item_count))
      || Number(cart.item_count) < 0 || !Number.isSafeInteger(Number(cart.total_price)) || Number(cart.total_price) < 0) return;
    this._renderLines(cart);
    this._renderSubtotal(cart);
    this._renderFreeShip(cart);
    this._renderCount(cart);
    this._renderUpsellVisibility(cart);
    this._renderCheckoutEnabled(cart);
  }

  _renderLines(cart) {
    const mount = this.querySelector('[data-kg-cart-items]');
    if (!mount) return;
    if (cart.item_count === 0) {
      mount.innerHTML = `
        <div class="kg-cart__empty" data-kg-cart-empty>
          <p>${this._escape(this._t('emptyTitle'))}</p>
          <a href="${this._attr(window.KGClient.cartRoute('pantry') || '')}" class="button button--secondary button--block">${this._escape(this._t('emptyCta'))}</a>
        </div>`;
      return;
    }
    const lines = cart.items.filter((line) => line && typeof line.key === 'string' && line.key.length > 0
      && /^\d+$/.test(String(line.product_id)) && Number.isSafeInteger(Number(line.quantity)) && Number(line.quantity) >= 0
      && Number.isSafeInteger(Number(line.final_line_price)) && Number(line.final_line_price) >= 0
      && typeof line.product_title === 'string');
    const items = lines.map((line) => {
      const lineUrl = window.KGClient.safeUrl(line.url)?.href;
      const mediaFallback = line.handle && Object.hasOwn(window.KGClient.config.groveProductMedia || {}, line.handle)
        ? window.KGClient.config.groveProductMedia[line.handle] : '';
      const imageUrl = this._imgUrl(line.image || mediaFallback, 160);
      const title = this._escape(line.product_title);
      const quantity = Number(line.quantity);
      const key = this._attr(line.key);
      const variant = typeof line.variant_title === 'string' && line.variant_title !== 'Default Title'
        ? `<p class="kg-cart__line-variant text-xs text-muted">${this._escape(line.variant_title)}</p>` : '';
      return `
      <li class="kg-cart__line" data-line-key="${key}">
        <a href="${this._attr(lineUrl || '')}" class="kg-cart__line-media">
          ${imageUrl ? `<img src="${this._attr(imageUrl)}" width="80" height="80" alt="${this._attr(line.product_title)}" loading="lazy">` : ''}
        </a>
        <div class="kg-cart__line-body">
          <p class="kg-cart__line-title"><a href="${this._attr(lineUrl || '')}">${title}</a></p>
          ${variant}
          <p class="kg-cart__line-price">${this._money(Number(line.final_line_price), cart.currency)}</p>
          <div class="kg-cart__line-qty" role="group" aria-label="${this._attr(this._t('quantityControls'))}">
            <button type="button" class="kg-cart__qty-btn" data-kg-qty-decrement data-line-key="${key}" aria-label="${this._attr(this._t('decrease'))}">−</button>
            <input type="number" class="kg-cart__qty-input" value="${quantity}" min="0" step="1" data-kg-qty-input data-line-key="${key}" aria-label="${this._attr(this._t('quantity'))}">
            <button type="button" class="kg-cart__qty-btn" data-kg-qty-increment data-line-key="${key}" aria-label="${this._attr(this._t('increase'))}">+</button>
          </div>
        </div>
        <button type="button" class="kg-cart__line-remove btn btn--ghost btn--sm" data-kg-cart-remove data-line-key="${key}" aria-label="${this._attr(this._t('remove').replace('{title}', line.product_title))}">✕</button>
      </li>`;
    }).join('');
    mount.innerHTML = `<ul class="kg-cart__lines" data-kg-cart-lines>${items}</ul>`;
  }

  _renderSubtotal(cart) {
    const el = this.querySelector('[data-kg-cart-subtotal]');
    if (el) el.textContent = this._money(cart.total_price, cart.currency);
  }

  _renderFreeShip(cart) {
    const bar = this.querySelector('[data-kg-freeship]');
    if (!bar) return;
    const rawThreshold = bar.getAttribute('data-threshold-cents') || '';
    const threshold = /^[1-9]\d*$/.test(rawThreshold) ? Number(rawThreshold) : 0;
    const thresholdCurrency = bar.getAttribute('data-threshold-currency') || '';
    if (!Number.isSafeInteger(threshold) || threshold <= 0
      || !/^[A-Z]{3}$/.test(thresholdCurrency) || cart.currency !== thresholdCurrency) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const pct = Math.min(100, Math.round((cart.total_price / threshold) * 100));
    const fill = bar.querySelector('[data-kg-freeship-fill]');
    const msg = bar.querySelector('[data-kg-freeship-msg]');
    const track = bar.querySelector('.kg-cart__freeship-track');
    if (fill) fill.style.width = pct + '%';
    if (track) track.setAttribute('aria-valuenow', String(pct));
    if (msg) {
      if (Number(cart.total_price) >= threshold) {
        msg.textContent = this._t('freeShippingUnlocked');
      } else {
        const remaining = this._money(threshold - Number(cart.total_price), cart.currency);
        const parts = this._t('freeShippingRemaining').split('{amount}');
        const emphasis = document.createElement('strong');
        emphasis.textContent = remaining;
        msg.replaceChildren(document.createTextNode(parts[0] || ''), emphasis, document.createTextNode(parts.slice(1).join('{amount}')));
      }
    }
  }

  _renderCount(cart) {
    document.querySelectorAll('[data-kg-cart-count], [data-cart-count]').forEach((el) => {
      el.textContent = String(cart.item_count);
    });
  }

  _renderUpsellVisibility(cart) {
    const up = this.querySelector('[data-kg-cart-upsell]');
    if (!up) return;
    const upsellProductId = Number(up.getAttribute('data-product-id'));
    if (!Number.isSafeInteger(upsellProductId) || upsellProductId < 1) return;
    const alreadyIn = cart.items.some((i) => i.product_id === upsellProductId);
    up.style.display = (cart.item_count > 0 && !alreadyIn) ? '' : 'none';
  }

  _renderCheckoutEnabled(cart) {
    const btn = this.querySelector('.kg-cart__checkout-form button[type="submit"]');
    if (!btn) return;
    btn.disabled = cart.item_count === 0;
    if (cart.item_count === 0) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  }

  /* ----- utils ----- */

  _money(cents, currency) {
    if (!Number.isSafeInteger(cents) || cents < 0) return '';
    try {
      return (cents / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: /^[A-Z]{3}$/.test(currency || '') ? currency : window.KGClient.config.currency
      });
    } catch {
      return '';
    }
  }

  _imgUrl(src, width) {
    if (!src) return '';
    const url = window.KGClient.safeUrl(src, { image: true });
    if (!url || !Number.isSafeInteger(width) || width < 1) return '';
    url.searchParams.set('width', String(width));
    return url.href;
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _attr(str) { return this._escape(str); }

  _t(key) {
    return window.KGClient?.config?.messages?.cart?.[key] || '';
  }

  _showCartStatus(message) {
    let status = this.querySelector('[data-kg-cart-status]');
    if (!status) {
      status = document.createElement('p');
      status.setAttribute('data-kg-cart-status', '');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      this.querySelector('[data-kg-cart-body]')?.prepend(status);
    }
    status.textContent = message;
  }

  _disableCartWrites() {
    this.querySelectorAll('[data-kg-qty-decrement], [data-kg-qty-increment], [data-kg-cart-remove], [data-kg-cart-upsell-add], [data-kg-cart-note]').forEach((control) => { control.disabled = true; });
  }

  _enableCartWrites() {
    this.querySelectorAll('[data-kg-qty-decrement], [data-kg-qty-increment], [data-kg-cart-remove], [data-kg-cart-upsell-add], [data-kg-cart-note]').forEach((control) => {
      if (!control.hasAttribute('aria-disabled')) control.disabled = false;
    });
  }
}

if (!customElements.get('kg-cart-drawer')) {
  customElements.define('kg-cart-drawer', KindredGroveCartDrawer);
}
