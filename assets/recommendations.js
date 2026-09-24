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
    if (!window.KGClient?.configValid) return;
    this.grid = this.querySelector('[data-kg-recs-grid]');
    this.productId = this.getAttribute('data-product-id');
    const requestedMaximum = Number.parseInt(this.getAttribute('data-max'), 10);
    if (!Number.isSafeInteger(requestedMaximum) || requestedMaximum < 1) return;
    this.max = Math.min(window.KGClient.limits.maxRecommendationResults, requestedMaximum);
    this.intent = this.getAttribute('data-intent');
    if (!['related', 'complementary'].includes(this.intent)) return;
    this._generation = (this._generation || 0) + 1;
    this._loaded = false;

    if (!this.grid || !/^\d+$/.test(this.productId || '')) return;

    if ('IntersectionObserver' in window) {
      this._observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this._observer.disconnect();
          this._observer = null;
          this._load();
        }
      }, { rootMargin: '200px 0px' });
      this._observer.observe(this);
    } else {
      this._load();
    }
  }

  disconnectedCallback() {
    this._generation += 1;
    this._observer?.disconnect();
    this._observer = null;
    this._abortController?.abort();
  }

  async _load() {
    if (this._loaded || !this.isConnected || !window.KGClient) return;
    this._loaded = true;
    const generation = this._generation;
    this._abortController = new AbortController();
    try {
      const endpoint = window.KGClient.route('recommendations/products.json');
      if (!endpoint) throw new Error('Recommendations route is unavailable.');
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ product_id: this.productId, limit: String(this.max), intent: this.intent }).toString();
      const data = await window.KGClient.requestJSON(url.href, { headers: { Accept: 'application/json' }, signal: this._abortController.signal });
      if (generation !== this._generation || !this.isConnected) return;
      const products = Array.isArray(data.products) ? data.products.slice(0, this.max) : [];
      if (products.length === 0) {
        this.remove();
        return;
      }
      this.grid.innerHTML = products.map((p) => this._cardHTML(p)).join('');
    } catch (err) {
      if (generation === this._generation && this.isConnected) this.remove();
    }
  }

  _cardHTML(p) {
    if (!p || typeof p.handle !== 'string' || typeof p.title !== 'string') return '';
    const href = window.KGClient.safeUrl(p.url)?.href || window.KGClient.productPath('products', p.handle);
    if (!href) return '';
    const price = this._money(p.price);
    const rawImage = p.featured_image?.url || p.featured_image || '';
    const img = window.KGClient.safeUrl(rawImage, { image: true })?.href || '';
    const quickViewLabel = window.KGClient.config.messages.recommendations.quickView;
    const samplePrice = window.KGClient.config.demoMode
      ? `<small class="kg-demo-price-label">${this._escape(window.KGClient.config.messages.demo.samplePrice)}</small>` : '';
    return `
      <li>
        <article class="product-card">
          <a href="${this._escape(href)}" class="product-card__media-link" aria-label="${this._escape(p.title)}">
            <div class="product-card__media">
              ${img ? `<img src="${img}" alt="${this._escape(p.title)}" loading="lazy" decoding="async" class="product-card__image">` : ''}
            </div>
          </a>
          <div class="product-card__body">
            ${p.vendor ? `<p class="product-card__vendor text-xs text-muted">${this._escape(p.vendor)}</p>` : ''}
            <h3 class="product-card__title"><a href="${this._escape(href)}" class="product-card__title-link">${this._escape(p.title)}</a></h3>
            <div class="product-card__price"><span class="product-card__price-amount">${price}</span></div>${samplePrice}
            <button type="button" class="product-card__quick-view button button--ghost button--sm" data-kg-quick-view data-product-handle="${this._escape(p.handle)}" aria-label="${this._escape(quickViewLabel)}: ${this._escape(p.title)}">${this._escape(quickViewLabel)}</button>
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
        currency: window.Shopify?.currency?.active || window.KGClient.config.currency
      });
    } catch {
      return '';
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
