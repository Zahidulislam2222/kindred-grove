/**
 * <kg-predictive-search> — debounced live search dropdown.
 *
 * Talks to Shopify's native /search/suggest.json endpoint (configured
 * via `data-endpoint` — populated by the `routes.predictive_search_url`
 * Liquid helper so it honors localization prefixes).
 *
 * Debounce and minimum query length come from the validated client config.
 *
 * The component is purely additive — the underlying form posts to
 * /search on submit, so no-JS users still get a results page.
 */

class KindredGrovePredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this._onInput = this._onInput.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFocusOut = this._onFocusOut.bind(this);
    this._debounceTimer = null;
    this._abortCtrl = null;
    this._activeIndex = -1;
    this._requestGeneration = 0;
    this._optionPrefix = `kg-search-${Math.random().toString(36).slice(2)}`;
  }

  connectedCallback() {
    if (!window.KGClient?.configValid) return;
    this.endpoint = this.getAttribute('data-endpoint') || window.KGClient.config.predictiveSearchEndpoint;
    this.types = (this.getAttribute('data-types') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((type, index, list) => ['product', 'page', 'article', 'collection'].includes(type)
        && list.indexOf(type) === index)
      .slice(0, window.KGClient.limits.maxSearchTypes);
    if (!this.types.length) return;
    const requestedLimit = Number.parseInt(this.getAttribute('data-limit'), 10);
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) return;
    this.limit = Math.min(window.KGClient.limits.maxSearchResultsPerType, requestedLimit);
    this.input = this.querySelector('[data-kg-search-input]');
    this.results = this.querySelector('[data-kg-search-results]');
    if (!this.input || !this.results) return;
    this.input.maxLength = window.KGClient.limits.maxSearchQueryLength;

    this.input.removeEventListener('input', this._onInput);
    this.input.removeEventListener('keydown', this._onKeyDown);
    this.removeEventListener('focusout', this._onFocusOut);
    this.input.addEventListener('input', this._onInput);
    this.input.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this._abortCtrl) this._abortCtrl.abort();
    this._requestGeneration += 1;
    this.input?.removeEventListener('input', this._onInput);
    this.input?.removeEventListener('keydown', this._onKeyDown);
    this.removeEventListener('focusout', this._onFocusOut);
  }

  _onInput() {
    const q = this.input.value.trim().slice(0, window.KGClient.limits.maxSearchQueryLength);
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this._abortCtrl) this._abortCtrl.abort();
    this._abortCtrl = null;
    this._requestGeneration += 1;
    if (q.length < window.KGClient.limits.searchMinimumLength) {
      this.results.replaceChildren();
      this._hide();
      return;
    }
    this._debounceTimer = setTimeout(() => this._search(q), window.KGClient.limits.searchDebounceMs);
  }

  _onKeyDown(event) {
    const items = Array.from(this.results.querySelectorAll('[role="option"]'));
    switch (event.key) {
      case 'ArrowDown':
        if (!items.length) return;
        event.preventDefault();
        this._setActive((this._activeIndex + 1) % items.length, items);
        break;
      case 'ArrowUp':
        if (!items.length) return;
        event.preventDefault();
        this._setActive((this._activeIndex - 1 + items.length) % items.length, items);
        break;
      case 'Enter':
        if (this._activeIndex >= 0 && items[this._activeIndex]) {
          event.preventDefault();
          const link = items[this._activeIndex].querySelector('a');
          if (link) window.location.href = link.href;
        }
        break;
      case 'Escape':
        this._hide();
        this.input.blur();
        break;
    }
  }

  _onFocusOut(event) {
    // Hide only when focus moves outside the component.
    if (!this.contains(event.relatedTarget)) this._hide();
  }

  _setActive(index, items) {
    items.forEach((el, i) => {
      if (i === index) {
        el.setAttribute('aria-selected', 'true');
        el.classList.add('is-active');
        this.input.setAttribute('aria-activedescendant', el.id);
      } else {
        el.removeAttribute('aria-selected');
        el.classList.remove('is-active');
      }
    });
    this._activeIndex = index;
  }

  async _search(q) {
    if (!window.KGClient) return;
    if (this._abortCtrl) this._abortCtrl.abort();
    this._abortCtrl = new AbortController();
    const generation = ++this._requestGeneration;

    const params = new URLSearchParams({
      q,
      'resources[limit]': this.limit,
      'resources[limit_scope]': 'each',
      'resources[type]': this.types.join(','),
      'resources[options][unavailable_products]': 'last',
    });
    const endpoint = window.KGClient.safeUrl(this.endpoint);
    if (!endpoint) {
      this._hide();
      return;
    }
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}.json`;
    endpoint.search = params.toString();

    try {
      const data = await window.KGClient.requestJSON(endpoint.href, {
        headers: { Accept: 'application/json' },
        signal: this._abortCtrl.signal,
      });
      if (generation !== this._requestGeneration || !this.isConnected) return;
      this._render(q, data.resources?.results || {});
    } catch (err) {
      if (generation !== this._requestGeneration) return;
      if (window.KGClient.isAbortError(err)) {
        this._hide();
        return;
      }
      this._hide();
    }
  }

  _render(q, results) {
    if (!results || typeof results !== 'object') results = {};
    const groups = [];
    if (Array.isArray(results.products) && results.products.length) {
      groups.push(this._group(this._message('products'), results.products.slice(0, this.limit), (p) => ({
        href: window.KGClient.safeUrl(p.url)?.href,
        title: p.title,
        meta: p.price != null ? this._money(p.price) : '',
        samplePrice: Boolean(window.KGClient.config.demoMode && p.price != null),
        image: window.KGClient.safeUrl(p.image, { image: true })?.href,
      })));
    }
    if (Array.isArray(results.pages) && results.pages.length) {
      groups.push(this._group(this._message('pages'), results.pages.slice(0, this.limit), (p) => ({
        href: window.KGClient.safeUrl(p.url)?.href,
        title: p.title,
        meta: '',
      })));
    }
    if (Array.isArray(results.articles) && results.articles.length) {
      groups.push(this._group(this._message('articles'), results.articles.slice(0, this.limit), (a) => ({
        href: window.KGClient.safeUrl(a.url)?.href,
        title: a.title,
        meta: a.author,
        image: window.KGClient.safeUrl(a.image, { image: true })?.href,
      })));
    }
    if (Array.isArray(results.collections) && results.collections.length) {
      groups.push(this._group(this._message('collections'), results.collections.slice(0, this.limit), (c) => ({
        href: window.KGClient.safeUrl(c.url)?.href,
        title: c.title,
        meta: '',
      })));
    }

    if (!groups.length) {
      this.results.innerHTML = `<p class="kg-search__empty">${this._escape(this._message('noResults').replace('{query}', q))}</p>`;
      this._show();
      return;
    }

    this.results.innerHTML = groups.join('');
    // Assign unique IDs for aria-activedescendant
    this.results.querySelectorAll('[role="option"]').forEach((el, i) => {
      el.id = `${this._optionPrefix}-${i}`;
    });
    this._activeIndex = -1;
    this._show();
  }

  _group(title, items, map) {
    const rows = items
      .map(map)
      .map((row) => {
        if (!row.href || typeof row.title !== 'string') return '';
        const img = row.image
          ? `<img src="${this._escape(row.image)}" alt="" loading="lazy" width="44" height="44">`
          : '<span class="kg-search__ph" aria-hidden="true"></span>';
        return `
          <li role="option">
            <a href="${this._escape(row.href)}">
              ${img}
              <span class="kg-search__title">${this._escape(row.title)}</span>
              ${row.meta ? `<span class="kg-search__meta">${this._escape(row.meta)}</span>` : ''}
              ${row.samplePrice ? `<small class="kg-demo-price-label">${this._escape(window.KGClient.config.messages.demo.samplePrice)}</small>` : ''}
            </a>
          </li>`;
      })
      .join('');
    return `
      <div class="kg-search__group">
        <p class="kg-search__group-title eyebrow">${this._escape(title)}</p>
        <ul class="kg-search__list">${rows}</ul>
      </div>`;
  }

  _money(cents) {
    // Predictive Search returns prices in major currency units (unlike cart.js).
    const raw = String(cents);
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return '';
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return '';
    return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || window.KGClient.config.currency,
    }).format(n);
  }

  _message(key) {
    return window.KGClient.config.messages.search[key] || '';
  }

  _escape(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  _show() {
    this.results.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
  }

  _hide() {
    this.results.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this._activeIndex = -1;
  }
}

if (!customElements.get('kg-predictive-search')) {
  customElements.define('kg-predictive-search', KindredGrovePredictiveSearch);
}
