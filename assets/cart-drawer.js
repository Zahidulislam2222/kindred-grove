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
 *   - Gift note typing → /cart/update.js (debounced 400ms)
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
    const input = this.querySelector(`[data-kg-qty-input][data-line-key="${CSS.escape(key)}"]`);
    const current = input ? parseInt(input.value, 10) : 1;
    const next = Math.max(0, current + delta);
    this._setQty(key, next);
  }

  async _setQty(key, qty) {
    if (this.pendingChanges.has(key)) return;
    this.pendingChanges.add(key);
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: qty })
      });
      if (!res.ok) throw new Error(`change ${res.status}`);
      await res.json();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
    } finally {
      this.pendingChanges.delete(key);
    }
  }

  async _upsellAdd(variantId, button) {
    const original = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.description || `add ${res.status}`);
      }
      await res.json();
      button.textContent = 'Added';
      document.dispatchEvent(new CustomEvent('cart:updated'));
      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }, 900);
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
      button.textContent = original;
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  _queueNoteSave(value) {
    const status = this.querySelector('[data-kg-cart-note-status]');
    if (status) status.textContent = this._t('note_saving', 'Saving note…');
    clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => this._saveNote(value), 400);
  }

  async _saveNote(note) {
    const status = this.querySelector('[data-kg-cart-note-status]');
    try {
      const res = await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ note })
      });
      if (!res.ok) throw new Error(`note ${res.status}`);
      if (status) status.textContent = this._t('note_saved', 'Note saved');
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
      if (status) status.textContent = this._t('note_error', 'Could not save note. Try again.');
    }
  }

  /* ----- refresh render ----- */

  async refresh() {
    try {
      const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const cart = await res.json();
      this._renderLines(cart);
      this._renderSubtotal(cart);
      this._renderFreeShip(cart);
      this._renderCount(cart);
      this._renderUpsellVisibility(cart);
      this._renderCheckoutEnabled(cart);
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
    }
  }

  _renderLines(cart) {
    const mount = this.querySelector('[data-kg-cart-items]');
    if (!mount) return;
    if (cart.item_count === 0) {
      mount.innerHTML = `
        <div class="kg-cart__empty" data-kg-cart-empty>
          <p>${this._t('empty.title', "Your cart is empty. Let's fix that.")}</p>
          <a href="/collections/all" class="button button--secondary button--block">${this._t('empty.cta', 'Browse the pantry')}</a>
        </div>`;
      return;
    }
    const money = (c) => this._money(c, cart.currency);
    const items = cart.items.map((line) => `
      <li class="kg-cart__line" data-line-key="${this._attr(line.key)}">
        <a href="${this._attr(line.url)}" class="kg-cart__line-media">
          ${line.image ? `<img src="${this._attr(this._imgUrl(line.image, 160))}" width="80" height="80" alt="${this._attr(line.product_title)}" loading="lazy">` : ''}
        </a>
        <div class="kg-cart__line-body">
          <p class="kg-cart__line-title"><a href="${this._attr(line.url)}">${this._escape(line.product_title)}</a></p>
          ${line.variant_title && line.variant_title !== 'Default Title' ? `<p class="kg-cart__line-variant text-xs text-muted">${this._escape(line.variant_title)}</p>` : ''}
          <p class="kg-cart__line-price">${money(line.final_line_price)}</p>
          <div class="kg-cart__line-qty" role="group" aria-label="Quantity controls">
            <button type="button" class="kg-cart__qty-btn" data-kg-qty-decrement data-line-key="${this._attr(line.key)}" aria-label="Decrease quantity">−</button>
            <input type="number" class="kg-cart__qty-input" value="${line.quantity}" min="0" step="1" data-kg-qty-input data-line-key="${this._attr(line.key)}" aria-label="Quantity">
            <button type="button" class="kg-cart__qty-btn" data-kg-qty-increment data-line-key="${this._attr(line.key)}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button type="button" class="kg-cart__line-remove btn btn--ghost btn--sm" data-kg-cart-remove data-line-key="${this._attr(line.key)}" aria-label="Remove ${this._attr(line.product_title)} from cart">✕</button>
      </li>`).join('');
    mount.innerHTML = `<ul class="kg-cart__lines" data-kg-cart-lines>${items}</ul>`;
  }

  _renderSubtotal(cart) {
    const el = this.querySelector('[data-kg-cart-subtotal]');
    if (el) el.textContent = this._money(cart.total_price, cart.currency);
  }

  _renderFreeShip(cart) {
    const bar = this.querySelector('[data-kg-freeship]');
    if (!bar) return;
    const threshold = parseInt(bar.getAttribute('data-threshold-cents'), 10) || 0;
    if (threshold <= 0) return;
    const pct = Math.min(100, Math.round((cart.total_price / threshold) * 100));
    const fill = bar.querySelector('[data-kg-freeship-fill]');
    const msg = bar.querySelector('[data-kg-freeship-msg]');
    const track = bar.querySelector('.kg-cart__freeship-track');
    if (fill) fill.style.width = pct + '%';
    if (track) track.setAttribute('aria-valuenow', String(pct));
    if (msg) {
      if (cart.total_price >= threshold) {
        msg.textContent = 'Free shipping unlocked ✦';
      } else {
        const remaining = this._money(threshold - cart.total_price, cart.currency);
        msg.innerHTML = `Add <strong>${this._escape(remaining)}</strong> more for free shipping`;
      }
    }
  }

  _renderCount(cart) {
    this.querySelectorAll('[data-kg-cart-count]').forEach((el) => {
      el.textContent = String(cart.item_count);
    });
  }

  _renderUpsellVisibility(cart) {
    const up = this.querySelector('[data-kg-cart-upsell]');
    if (!up) return;
    const upsellProductId = parseInt(up.getAttribute('data-product-id'), 10);
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
    try {
      return (cents / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: currency || window.Shopify?.currency?.active || 'USD'
      });
    } catch {
      return `$${(cents / 100).toFixed(2)}`;
    }
  }

  _imgUrl(src, width) {
    // Shopify image URL params — trust that line.image is already a CDN URL.
    if (!src) return '';
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}width=${width}`;
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

  _t(key, fallback) {
    const dict = window.KG_I18N?.cart;
    if (!dict) return fallback;
    const parts = key.split('.');
    let node = dict;
    for (const p of parts) { node = node && node[p]; if (node == null) return fallback; }
    return node;
  }
}

if (!customElements.get('kg-cart-drawer')) {
  customElements.define('kg-cart-drawer', KindredGroveCartDrawer);
}
