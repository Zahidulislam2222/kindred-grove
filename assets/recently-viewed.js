/**
 * <kg-recently-viewed> — reads localStorage history, fetches each product's
 * JSON, renders into a grid. Writes the current product handle to history
 * on PDP load (deduping + capping at 12 entries).
 *
 * LocalStorage key: 'kg:recently-viewed' — JSON array of { handle, title, ts }.
 * Cap: 12 total stored. Cards shown: min(max-setting, stored - current).
 */
const STORAGE_KEY = 'kg:recently-viewed';
const STORAGE_CAP = 12;

class KindredGroveRecentlyViewed extends HTMLElement {
  async connectedCallback() {
    this.grid = this.querySelector('[data-kg-rv-grid]');
    const currentHandle = this.getAttribute('data-current-handle');
    const currentTitle = this.getAttribute('data-current-title');
    const maxShow = parseInt(this.getAttribute('data-max') || '4', 10);

    // 1. Read existing history.
    const history = this._readHistory();

    // 2. Render cards for history entries other than the current product.
    const toShow = history
      .filter((entry) => entry.handle && entry.handle !== currentHandle)
      .slice(0, maxShow);

    if (toShow.length === 0) {
      // Keep hidden and bail — nothing to render today.
    } else {
      this.removeAttribute('hidden');
      await this._renderCards(toShow);
    }

    // 3. Write current product to history for next time.
    if (currentHandle) {
      const next = [{ handle: currentHandle, title: currentTitle, ts: Date.now() }]
        .concat(history.filter((e) => e.handle !== currentHandle))
        .slice(0, STORAGE_CAP);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) { /* quota */ }
    }
  }

  _readHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  async _renderCards(entries) {
    const fragments = await Promise.all(entries.map((e) => this._fetchCard(e.handle)));
    const html = fragments.filter(Boolean).join('');
    if (html) this.grid.innerHTML = html;
    else this.setAttribute('hidden', '');
  }

  async _fetchCard(handle) {
    try {
      const res = await fetch(`/products/${encodeURIComponent(handle)}.js`, {
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return '';
      const p = await res.json();
      return this._cardHTML(p);
    } catch (_) {
      return '';
    }
  }

  _cardHTML(p) {
    const price = this._money(p.price);
    const img = p.featured_image || (p.images && p.images[0]) || '';
    return `
      <li>
        <article class="product-card product-card--sm">
          <a href="/products/${p.handle}" class="product-card__media-link" aria-label="${this._escape(p.title)}">
            <div class="product-card__media">
              ${img ? `<img src="${img}" alt="${this._escape(p.title)}" loading="lazy" decoding="async" class="product-card__image">` : ''}
            </div>
          </a>
          <div class="product-card__body">
            ${p.vendor ? `<p class="product-card__vendor text-xs text-muted">${this._escape(p.vendor)}</p>` : ''}
            <h3 class="product-card__title"><a href="/products/${p.handle}" class="product-card__title-link">${this._escape(p.title)}</a></h3>
            <div class="product-card__price"><span class="product-card__price-amount">${price}</span></div>
          </div>
        </article>
      </li>
    `;
  }

  _money(cents) {
    try {
      return (cents / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: window.Shopify?.currency?.active || 'USD'
      });
    } catch {
      return `$${(cents / 100).toFixed(2)}`;
    }
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

if (!customElements.get('kg-recently-viewed')) {
  customElements.define('kg-recently-viewed', KindredGroveRecentlyViewed);
}
