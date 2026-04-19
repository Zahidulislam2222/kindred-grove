/**
 * <kg-gallery> — PDP image gallery.
 *
 * Server renders first image in the main slot and all images as thumbnail
 * buttons. Click / Enter / Space on a thumb swaps the main image. Arrow
 * keys navigate thumbs. Mobile: horizontal swipe on the main image moves
 * to next/prev thumb.
 *
 * ARIA: role=tablist on thumbs, role=tab + aria-selected on each thumb,
 * aria-controls points to the main image.
 */
class KindredGroveGallery extends HTMLElement {
  constructor() {
    super();
    this.mainImg = null;
    this.thumbs = [];
    this.activeIndex = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this._onThumbClick = this._onThumbClick.bind(this);
    this._onThumbKey = this._onThumbKey.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onVariantImage = this._onVariantImage.bind(this);
  }

  connectedCallback() {
    this.mainImg = this.querySelector('[data-kg-gallery-main] img');
    this.thumbs = Array.from(this.querySelectorAll('[data-kg-gallery-thumb]'));
    this.thumbs.forEach((t) => {
      t.addEventListener('click', this._onThumbClick);
      t.addEventListener('keydown', this._onThumbKey);
    });
    const mainSlot = this.querySelector('[data-kg-gallery-main]');
    if (mainSlot) {
      mainSlot.addEventListener('touchstart', this._onTouchStart, { passive: true });
      mainSlot.addEventListener('touchend', this._onTouchEnd, { passive: true });
    }
    document.addEventListener('variant:changed', this._onVariantImage);
  }

  disconnectedCallback() {
    document.removeEventListener('variant:changed', this._onVariantImage);
  }

  _onThumbClick(event) {
    const idx = this.thumbs.indexOf(event.currentTarget);
    if (idx >= 0) this._activate(idx);
  }

  _onThumbKey(event) {
    const idx = this.thumbs.indexOf(event.currentTarget);
    if (idx < 0) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this._activate((idx + 1) % this.thumbs.length, true);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this._activate((idx - 1 + this.thumbs.length) % this.thumbs.length, true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this._activate(0, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      this._activate(this.thumbs.length - 1, true);
    }
  }

  _onTouchStart(event) {
    const t = event.changedTouches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
  }

  _onTouchEnd(event) {
    const t = event.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return; // not a horizontal swipe

    if (dx < 0) {
      this._activate((this.activeIndex + 1) % this.thumbs.length);
    } else {
      this._activate((this.activeIndex - 1 + this.thumbs.length) % this.thumbs.length);
    }
  }

  _onVariantImage(event) {
    if (!event.detail || !event.detail.featured_media) return;
    const imgUrl = event.detail.featured_media.preview_image?.src;
    if (!imgUrl) return;
    const match = this.thumbs.findIndex((t) => {
      const src = t.getAttribute('data-src-large') || '';
      return src.includes(imgUrl.split('?')[0].split('/').pop().split('_').shift());
    });
    if (match >= 0) this._activate(match, false);
  }

  _activate(idx, focusThumb) {
    if (!this.mainImg) return;
    const thumb = this.thumbs[idx];
    if (!thumb) return;
    this.activeIndex = idx;

    this.mainImg.src = thumb.getAttribute('data-src-large');
    this.mainImg.srcset = thumb.getAttribute('data-srcset');
    this.mainImg.alt = thumb.getAttribute('data-alt') || '';
    const w = thumb.getAttribute('data-width');
    const h = thumb.getAttribute('data-height');
    if (w) this.mainImg.width = w;
    if (h) this.mainImg.height = h;

    this.thumbs.forEach((t, i) => {
      const active = i === idx;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (focusThumb) thumb.focus();
  }
}

if (!customElements.get('kg-gallery')) {
  customElements.define('kg-gallery', KindredGroveGallery);
}
