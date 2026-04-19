/**
 * <kg-predictive-search> — debounced live search dropdown.
 *
 * Talks to Shopify's native /search/suggest.json endpoint (configured
 * via `data-endpoint` — populated by the `routes.predictive_search_url`
 * Liquid helper so it honors localization prefixes).
 *
 * Debounce: 300ms. Minimum query length: 2 chars.
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
  }

  connectedCallback() {
    this.endpoint = this.getAttribute('data-endpoint') || '/search/suggest';
    this.types = (this.getAttribute('data-types') || 'product,page,article')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.limit = Math.max(1, Math.min(10, parseInt(this.getAttribute('data-limit'), 10) || 4));
    this.input = this.querySelector('[data-kg-search-input]');
    this.results = this.querySelector('[data-kg-search-results]');
    if (!this.input || !this.results) return;

    this.input.addEventListener('input', this._onInput);
    this.input.addEventListener('keydown', this._onKeyDown);
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this._abortCtrl) this._abortCtrl.abort();
  }

  _onInput() {
    const q = this.input.value.trim();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (q.length < 2) {
      this._hide();
      return;
    }
    this._debounceTimer = setTimeout(() => this._search(q), 300);
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
    if (this._abortCtrl) this._abortCtrl.abort();
    this._abortCtrl = new AbortController();

    const params = new URLSearchParams({
      q,
      'resources[limit]': this.limit,
      'resources[limit_scope]': 'each',
      'resources[type]': this.types.join(','),
      'resources[options][unavailable_products]': 'last',
    });
    const url = `${this.endpoint}.json?${params}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: this._abortCtrl.signal,
      });
      if (!res.ok) throw new Error(`Predictive search ${res.status}`);
      const data = await res.json();
      this._render(q, data.resources?.results || {});
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (window.Sentry) window.Sentry.captureException(err);
      this._hide();
    }
  }

  _render(q, results) {
    const groups = [];
    if (results.products?.length) {
      groups.push(this._group('Products', results.products, (p) => ({
        href: p.url,
        title: p.title,
        meta: p.price ? this._money(p.price) : '',
        image: p.image,
      })));
    }
    if (results.pages?.length) {
      groups.push(this._group('Pages', results.pages, (p) => ({
        href: p.url,
        title: p.title,
        meta: '',
      })));
    }
    if (results.articles?.length) {
      groups.push(this._group('Recipes & stories', results.articles, (a) => ({
        href: a.url,
        title: a.title,
        meta: a.author,
        image: a.image,
      })));
    }
    if (results.collections?.length) {
      groups.push(this._group('Collections', results.collections, (c) => ({
        href: c.url,
        title: c.title,
        meta: '',
      })));
    }

    if (!groups.length) {
      this.results.innerHTML = `<p class="kg-search__empty">No matches for "${this._escape(q)}".</p>`;
      this._show();
      return;
    }

    this.results.innerHTML = groups.join('');
    // Assign unique IDs for aria-activedescendant
    this.results.querySelectorAll('[role="option"]').forEach((el, i) => {
      el.id = `kg-search-option-${i}`;
    });
    this._activeIndex = -1;
    this._show();
  }

  _group(title, items, map) {
    const rows = items
      .map(map)
      .map((row) => {
        const img = row.image
          ? `<img src="${row.image}" alt="" loading="lazy" width="44" height="44">`
          : '<span class="kg-search__ph" aria-hidden="true"></span>';
        return `
          <li role="option">
            <a href="${row.href}">
              ${img}
              <span class="kg-search__title">${this._escape(row.title)}</span>
              ${row.meta ? `<span class="kg-search__meta">${this._escape(row.meta)}</span>` : ''}
            </a>
          </li>`;
      })
      .join('');
    return `
      <div class="kg-search__group">
        <p class="kg-search__group-title eyebrow">${title}</p>
        <ul class="kg-search__list">${rows}</ul>
      </div>`;
  }

  _money(cents) {
    // Shopify predictive-search returns price in cents as a string.
    const n = Number(cents) / 100;
    if (!Number.isFinite(n)) return '';
    return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD',
    }).format(n);
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
