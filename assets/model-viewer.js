/* Shopify model-viewer UI adapter. The Shopify feature loads only after explicit activation. */
(function () {
  'use strict';

  if (customElements.get('kg-model-viewer')) return;

  class KindredGroveModelViewer extends HTMLElement {
    constructor() {
      super();
      this.generation = 0;
      this.loadRequest = 0;
      this.loadTimer = null;
      this.loading = false;
      this.initialized = false;
      this.config = null;
      this.button = null;
      this.status = null;
      this.poster = null;
      this.viewerContainer = null;
      this.viewer = null;
      this.modelTemplate = null;
      this.onActivate = this.onActivate.bind(this);
    }

    connectedCallback() {
      this.disconnectListeners();
      this.generation += 1;
      this.loadRequest += 1;
      this.clearLoadTimer();
      this.button = this.querySelector('[data-kg-model-load]');
      this.status = this.querySelector('[data-kg-model-status]');
      this.poster = this.querySelector('[data-kg-model-poster]');
      this.viewerContainer = this.querySelector('[data-kg-model-viewer]');
      this.viewer = this.viewerContainer && this.viewerContainer.querySelector('model-viewer');
      this.modelTemplate = this.querySelector('[data-kg-model-template]');
      this.config = this.readConfig();

      if (!this.config || !this.button || !this.status || !this.poster || !this.viewerContainer || !this.modelTemplate) {
        this.showUnavailable();
        return;
      }

      this.button.textContent = this.config.copy.loadLabel;
      this.button.hidden = this.initialized;
      this.button.disabled = this.initialized;
      this.status.textContent = '';
      this.button.addEventListener('click', this.onActivate);
    }

    disconnectedCallback() {
      this.generation += 1;
      this.loadRequest += 1;
      this.clearLoadTimer();
      this.loading = false;
      this.disconnectListeners();
    }

    disconnectListeners() {
      if (this.button) this.button.removeEventListener('click', this.onActivate);
    }

    clearLoadTimer() {
      if (this.loadTimer !== null) window.clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }

    readConfig() {
      try {
        const node = this.querySelector('[data-kg-model-config]');
        const value = JSON.parse(node && node.dataset ? node.dataset.json || 'null' : 'null');
        const feature = value && value.feature;
        const copy = value && value.copy;
        if (!Number.isSafeInteger(value.loadTimeoutMs) || value.loadTimeoutMs <= 0
          || !feature || typeof feature.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(feature.name)
          || typeof feature.version !== 'string' || !/^\d+\.\d+$/.test(feature.version)
          || !copy || ['heading', 'loadLabel', 'loadingLabel', 'unavailableLabel'].some((key) => typeof copy[key] !== 'string' || !copy[key].trim())
          || typeof copy.noScriptLabel !== 'string' || (copy.body !== null && typeof copy.body !== 'string')) return null;
        return value;
      } catch (_error) {
        return null;
      }
    }

    onActivate() {
      if (this.loading || this.initialized || !this.config) return;
      const shopify = window.Shopify;
      if (!shopify || typeof shopify.loadFeatures !== 'function') {
        this.showUnavailable();
        return;
      }

      this.loading = true;
      this.button.disabled = true;
      this.status.textContent = this.config.copy.loadingLabel;
      const generation = this.generation;
      const request = ++this.loadRequest;
      this.loadTimer = window.setTimeout(() => this.onFeatureTimeout(generation, request), this.config.loadTimeoutMs);
      try {
        shopify.loadFeatures([{
          name: this.config.feature.name,
          version: this.config.feature.version,
          onLoad: (errors) => this.onFeatureLoaded(errors, generation, request),
      }]);
      } catch (_error) {
        this.clearLoadTimer();
        this.loadRequest += 1;
        this.loading = false;
        this.showUnavailable();
      }
    }

    onFeatureTimeout(generation, request) {
      if (generation !== this.generation || request !== this.loadRequest || !this.isConnected) return;
      this.loadTimer = null;
      this.loadRequest += 1;
      this.loading = false;
      this.showUnavailable();
    }

    onFeatureLoaded(errors, generation, request) {
      if (generation !== this.generation || request !== this.loadRequest || !this.isConnected || this.initialized) return;
      this.clearLoadTimer();
      this.loadRequest += 1;
      this.loading = false;
      const shopify = window.Shopify;
      const loadFailed = Array.isArray(errors) ? errors.length > 0 : !!errors;
      if (loadFailed || !shopify || typeof shopify.ModelViewerUI !== 'function') {
        this.showUnavailable();
        return;
      }

      try {
        this.viewerContainer.replaceChildren(this.modelTemplate.content.cloneNode(true));
        this.viewer = this.viewerContainer.querySelector('model-viewer');
        if (!this.viewer) {
          this.showUnavailable();
          return;
        }
        this.viewerContainer.hidden = false;
        this.modelViewerUI = new shopify.ModelViewerUI(this.viewer);
        this.initialized = true;
        this.poster.hidden = true;
        this.button.hidden = true;
        this.status.textContent = '';
      } catch (_error) {
        this.viewerContainer.hidden = true;
        this.viewerContainer.replaceChildren();
        this.showUnavailable();
      }
    }

    showUnavailable() {
      if (this.button) this.button.disabled = true;
      if (this.status) this.status.textContent = this.config
        ? this.config.copy.unavailableLabel
        : (this.getAttribute('data-unavailable-label') || '');
    }
  }

  customElements.define('kg-model-viewer', KindredGroveModelViewer);
})();
