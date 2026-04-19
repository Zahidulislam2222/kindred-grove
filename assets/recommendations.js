/**
 * <kg-recommendations> — lazy-loaded Shopify product recommendations.
 *
 * When the element scrolls into view (IntersectionObserver), fetches
 * /recommendations/products.json?product_id=X&limit=N&intent=related and
 * replaces placeholder <li> elements with real product cards. Hides the
 * whole block if zero recs come back.
 */
class KindredGroveRecommendations extends HTMLElement {
  connectedCallback() {
    this.grid = this.querySelector('[data-kg-recs-grid]');
    this.productId = this.getAttribute('data-product-id');
    this.max = parseInt(this.getAttribute('data-max') || '4', 10);
    this.intent = this.getAttribute('data-intent') || 'related';

    if (!this.productId) return;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          this._load();
        }
      }, { rootMargin: '200px 0px' });
      io.observe(this);
    } else {
      this._load();
    }
  }

  async _load() {
    try {
      const url = `/recommendations/products.json?product_id=${encodeURIComponent(this.productId)}&limit=${this.max}&intent=${this.intent}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const products = data.products || [];
      if (products.length === 0) {
        this.remove();
        return;
      }
      this.grid.innerHTML = products.map((p) => this._cardHTML(p)).join('');
    } catch (err) {
      if (window.Sentry) window.Sentry.captureException(err);
      this.remove();
    }
  }

  _cardHTML(p) {
    const price = this._money(p.price);
    const img = p.featured_image?.url || p.featured_image || '';
    return `
      <li>
        <article class="product-card">
          <a href="${p.url}" class="product-card__media-link" aria-label="${this._escape(p.title)}">
            <div class="product-card__media">
              ${img ? `<img src="${img}" alt="${this._escape(p.title)}" loading="lazy" decoding="async" class="product-card__image">` : ''}
            </div>
          </a>
          <div class="product-card__body">
            ${p.vendor ? `<p class="product-card__vendor text-xs text-muted">${this._escape(p.vendor)}</p>` : ''}
            <h3 class="product-card__title"><a href="${p.url}" class="product-card__title-link">${this._escape(p.title)}</a></h3>
            <div class="product-card__price"><span class="product-card__price-amount">${price}</span></div>
            <button type="button" class="product-card__quick-view button button--ghost button--sm" data-kg-quick-view data-product-handle="${p.handle}" aria-label="Quick view ${this._escape(p.title)}">Quick view</button>
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

if (!customElements.get('kg-recommendations')) {
  customElements.define('kg-recommendations', KindredGroveRecommendations);
}
