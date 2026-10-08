/* <kg-recently-viewed> — preference-consented, time-limited product history. */
class KindredGroveRecentlyViewed extends HTMLElement {
  constructor() {
    super();
    this.grid = null;
    this.config = {};
    this.storage = null;
    this.unsubscribePrivacy = null;
    this.lastAllowed = null;
    this.renderGeneration = 0;
    this.connectionGeneration = 0;
    this.abortController = null;
  }

  async connectedCallback() {
    if (typeof this.unsubscribePrivacy === 'function') this.unsubscribePrivacy();
    this.unsubscribePrivacy = null;
    this.lastAllowed = null;
    const connection = ++this.connectionGeneration;
    this.grid = this.querySelector('[data-kg-rv-grid]');
    this.config = this._readConfig();
    this.storage = this.config.storageKeys || {};

    if (!window.KGClient?.configValid) {
      this._clearHistory();
      this._hide();
      return;
    }

    if (!window.KGPrivacy) {
      this._clearHistory();
      this._hide();
      return;
    }
    await Promise.resolve(window.KGPrivacy.ready).catch(() => false);
    if (!this.isConnected || connection !== this.connectionGeneration) return;
    this.unsubscribePrivacy = window.KGPrivacy.subscribe((permissions) => {
      var allowed = !!permissions.preferences && window.KGPrivacy.allowed('preferences');
      if (allowed === this.lastAllowed) return;
      this.lastAllowed = allowed;
      if (allowed) this._loadAndRender();
      else this._clearHistoryAndHide();
    });
  }

  disconnectedCallback() {
    this.renderGeneration += 1;
    this.connectionGeneration += 1;
    this.abortController?.abort();
    this.abortController = null;
    if (typeof this.unsubscribePrivacy === 'function') this.unsubscribePrivacy();
    this.unsubscribePrivacy = null;
  }

  _readConfig() {
    return window.KGPrivacy && window.KGPrivacy.configValid ? window.KGPrivacy.config : {};
  }

  _clearHistory() {
    const key = this.storage && this.storage.recentlyViewed;
    if (!key) return;
    try { window.localStorage.removeItem(key); } catch (_error) { /* unavailable storage */ }
  }

  _clearHistoryAndHide() {
    this.renderGeneration += 1;
    this.abortController?.abort();
    this.abortController = null;
    this._clearHistory();
    this._hide();
  }

  _hide() {
    this.setAttribute('hidden', '');
    if (this.grid) this.grid.replaceChildren();
  }

  _allowed() {
    return !!(window.KGPrivacy && window.KGPrivacy.allowed('preferences'));
  }

  _loadHistory() {
    const key = this.storage && this.storage.recentlyViewed;
    if (!key || !this._allowed()) return [];
    try {
      const raw = window.localStorage.getItem(key);
      if (raw && raw.length > window.KGClient.limits.maxRecentlyViewedStorageChars) {
        this._clearHistory();
        return [];
      }
      const history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) return [];
      const retentionDays = this.config.recentlyViewed && this.config.recentlyViewed.retentionDays;
      if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) return [];
      const oldestTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      return history
        .filter((entry) => entry && typeof entry.handle === 'string' && window.KGClient.productPath('products', entry.handle)
          && Number.isFinite(entry.ts) && entry.ts >= oldestTimestamp)
        .map((entry) => ({ handle: entry.handle, ts: entry.ts }));
    } catch (_error) {
      return [];
    }
  }

  _loadAndRender() {
    this.abortController?.abort();
    this.abortController = null;
    const generation = ++this.renderGeneration;
    const rawCurrentHandle = this.getAttribute('data-current-handle');
    const currentHandle = window.KGClient.productPath('products', rawCurrentHandle) ? rawCurrentHandle : null;
    const keys = this.storage;
    if (!this._allowed() || !keys || !keys.recentlyViewed) {
      this._clearHistoryAndHide();
      return;
    }

    const history = this._loadHistory();
    const recentConfig = this.config.recentlyViewed;
    if (!recentConfig || !Number.isSafeInteger(recentConfig.maxEntries) || recentConfig.maxEntries < 1 || !Number.isSafeInteger(recentConfig.retentionDays) || recentConfig.retentionDays < 1 || !Number.isSafeInteger(recentConfig.displayDefault) || recentConfig.displayDefault < 1 || recentConfig.displayDefault > recentConfig.maxEntries) {
      this._clearHistoryAndHide();
      return;
    }
    const limit = recentConfig.maxEntries;
    const next = currentHandle
      ? [{ handle: currentHandle, ts: Date.now() }].concat(history.filter((entry) => entry.handle !== currentHandle)).slice(0, limit)
      : history.slice(0, limit);
    try { window.localStorage.setItem(keys.recentlyViewed, JSON.stringify(next)); } catch (_error) { /* blocked/quota storage */ }

    const requested = Number.parseInt(this.getAttribute('data-max') || String(recentConfig.displayDefault), 10);
    const showLimit = Math.min(limit, Number.isFinite(requested) && requested > 0 ? requested : recentConfig.displayDefault);
    const visibleEntries = history.filter((entry) => entry.handle !== currentHandle).slice(0, showLimit);
    if (!visibleEntries.length) {
      this._hide();
      return;
    }
    this._renderCards(visibleEntries, generation);
  }

  _route(template, handle) {
    if (typeof template !== 'string' || !template.includes('{handle}') || !window.KGClient) return null;
    const path = window.KGClient.productPath('products', handle);
    if (!path) return null;
    return template.endsWith('.js') ? `${path}.js` : path;
  }

  async _renderCards(entries, generation) {
    if (!this.grid || !this._allowed()) return;
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    const limit = window.KGClient.limits.maxRecentlyViewedRequests;
    const cards = await Promise.all(entries.slice(0, limit).map((entry) => this._fetchCard(entry.handle, controller.signal)));
    if (generation !== this.renderGeneration || !this._allowed()) return;
    const html = cards.filter(Boolean).join('');
    if (html) {
      this.grid.innerHTML = html;
      this.removeAttribute('hidden');
    } else {
      this._hide();
    }
  }

  async _fetchCard(handle, signal) {
    const route = this._route(this.config.routes && this.config.routes.productJsonTemplate, handle);
    if (!route || !this._allowed() || !window.KGClient) return '';
    try {
      const product = await window.KGClient.requestJSON(route, { headers: { Accept: 'application/json' }, signal });
      if (!this._allowed()) return '';
      return this._cardHTML(product);
    } catch (_error) {
      return '';
    }
  }

  _cardHTML(product) {
    if (!product || typeof product.handle !== 'string' || typeof product.title !== 'string') return '';
    const price = this._money(product.price);
    const rawImage = product.featured_image || (Array.isArray(product.images) && product.images[0]) || '';
    const image = window.KGClient.safeUrl(rawImage, { image: true })?.href || '';
    const productHref = this._route(this.config.routes && this.config.routes.productPageTemplate, product.handle);
    if (!productHref) return '';
    const samplePrice = window.KGClient.config.demoMode
      ? `<small class="kg-demo-price-label">${this._escape(window.KGClient.config.messages.demo.samplePrice)}</small>` : '';
    return `
      <li>
        <article class="product-card product-card--sm">
          <a href="${this._escape(productHref)}" class="product-card__media-link" aria-label="${this._escape(product.title)}">
            <div class="product-card__media">
              ${image ? `<img src="${this._escape(image)}" alt="${this._escape(product.title)}" loading="lazy" decoding="async" class="product-card__image">` : ''}
            </div>
          </a>
          <div class="product-card__body">
            ${product.vendor ? `<p class="product-card__vendor text-xs text-muted">${this._escape(product.vendor)}</p>` : ''}
            <h3 class="product-card__title"><a href="${this._escape(productHref)}" class="product-card__title-link">${this._escape(product.title)}</a></h3>
            <div class="product-card__price"><span class="product-card__price-amount">${price}</span></div>${samplePrice}
          </div>
        </article>
      </li>
    `;
  }

  _money(cents) {
    const amount = Number(cents);
    if (!Number.isSafeInteger(amount) || amount < 0) return '';
    try {
      return (amount / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active || window.KGClient.config.currency
      });
    } catch (_error) {
      return '';
    }
  }

  _escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

if (!customElements.get('kg-recently-viewed')) {
  customElements.define('kg-recently-viewed', KindredGroveRecentlyViewed);
}
