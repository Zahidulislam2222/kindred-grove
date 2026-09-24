/* Shared, bounded same-origin transport for additive storefront components. */
(() => {
  'use strict';

  const configElement = document.getElementById('kg-client-config');
  let config;
  try {
    config = JSON.parse(configElement?.dataset.config || 'null');
  } catch (_error) {
    config = null;
  }

  const positiveInteger = (value) => (Number.isSafeInteger(value) && value > 0 ? value : 0);
  const root = typeof config?.root === 'string' && config.root.startsWith('/') && !config.root.startsWith('//')
    ? config.root.endsWith('/') ? config.root : `${config.root}/`
    : null;
  const limits = Object.freeze({
    requestTimeoutMs: positiveInteger(config?.requestTimeoutMs),
    productAddedResetMs: positiveInteger(config?.productAddedResetMs),
    quickViewCloseMs: positiveInteger(config?.quickViewCloseMs),
    cartNoteDebounceMs: positiveInteger(config?.cartNoteDebounceMs),
    collectionFilterDebounceMs: positiveInteger(config?.collectionFilterDebounceMs),
    maxResponseBytes: positiveInteger(config?.maxResponseBytes),
    searchDebounceMs: positiveInteger(config?.searchDebounceMs),
    searchMinimumLength: positiveInteger(config?.searchMinimumLength),
    maxSearchQueryLength: positiveInteger(config?.maxSearchQueryLength),
    maxSearchResultsPerType: positiveInteger(config?.maxSearchResultsPerType),
    maxSearchTypes: positiveInteger(config?.maxSearchTypes),
    maxRecommendationResults: positiveInteger(config?.maxRecommendationResults),
    maxRecentlyViewedRequests: positiveInteger(config?.maxRecentlyViewedRequests),
    maxRecentlyViewedStorageChars: positiveInteger(config?.maxRecentlyViewedStorageChars),
    maxProductVariants: positiveInteger(config?.maxProductVariants),
    maxPendingCartWrites: positiveInteger(config?.maxPendingCartWrites),
    maxCartAddItems: positiveInteger(config?.maxCartAddItems),
  });
  const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
  const requiredMessages = {
    search: ['products', 'pages', 'articles', 'collections', 'noResults'],
    quickView: ['loading', 'loadError', 'addToCart', 'added', 'soldOut', 'viewDetails', 'cartStatusUnknown'],
    product: ['addToCart', 'added', 'soldOut', 'cartStatusUnknown'],
    cart: ['statusUnknown', 'statusError', 'adding', 'added', 'emptyTitle', 'emptyCta', 'quantity', 'quantityControls', 'decrease', 'increase', 'remove', 'freeShippingUnlocked', 'freeShippingRemaining', 'noteSaving', 'noteSaved', 'noteError'],
    recommendations: ['quickView'],
    demo: ['samplePrice'],
  };
  const messagesValid = isRecord(config?.messages) && Object.entries(requiredMessages).every(([section, keys]) => (
    isRecord(config.messages[section]) && keys.every((key) => typeof config.messages[section][key] === 'string' && config.messages[section][key].length > 0)
  ));
  const cdnHosts = new Set(Array.isArray(config?.cdnHosts)
    ? config.cdnHosts.filter((host) => typeof host === 'string' && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(host))
    : []);
  const cartRoutesValid = isRecord(config?.cartRoutes)
    && ['add', 'cart', 'change', 'update', 'pantry'].every((key) => typeof config.cartRoutes[key] === 'string' && !!safeUrl(config.cartRoutes[key]));
  const groveMediaValid = isRecord(config?.groveProductMedia)
    && Object.entries(config.groveProductMedia).every(([handle, url]) => /^[a-z0-9][a-z0-9_-]{0,254}$/i.test(handle) && !!safeUrl(url, { image: true }));
  const configValid = isRecord(config) && !!root
    && typeof config?.predictiveSearchEndpoint === 'string'
    && Object.values(limits).every((value) => value > 0)
    && /^[A-Z]{3}$/.test(config.currency || '')
    && typeof config.demoMode === 'boolean'
    && messagesValid
    && cartRoutesValid
    && groveMediaValid
    && Array.isArray(config.cdnHosts)
    && cdnHosts.size === config.cdnHosts.length
    && !!safeUrl(config.predictiveSearchEndpoint);

  function safeUrl(raw, { image = false } = {}) {
    if (typeof raw !== 'string' || raw.length === 0 || /[\u0000-\u001f\u007f]/.test(raw)) return null;
    if (raw.startsWith('//')) {
      if (!image) return null;
      raw = `https:${raw}`;
    }
    let url;
    try {
      url = new URL(raw, window.location.href);
    } catch (_error) {
      return null;
    }
    if (url.username || url.password || url.hash || !['https:', 'http:'].includes(url.protocol)) return null;
    for (const key of url.searchParams.keys()) {
      if (/(?:pass(?:word)?|token|secret|auth|credential|api[-_]?key)/i.test(key)) return null;
    }
    const sameOrigin = url.origin === window.location.origin;
    const approvedImageHost = image && url.protocol === 'https:' && cdnHosts.has(url.hostname.toLowerCase());
    if (!sameOrigin && !approvedImageHost) return null;
    return url;
  }

  function route(path) {
    if (!root || typeof path !== 'string' || path.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(path)
      || /[\u0000-\u001f\u007f?#\\]/.test(path)
      || path.split('/').some((segment) => segment === '.' || segment === '..')) return null;
    const relative = path.replace(/^\/+/, '');
    return safeUrl(`${root}${relative}`)?.href || null;
  }

  function cartRoute(name) {
    if (!configValid || !['add', 'cart', 'change', 'update', 'pantry'].includes(name)) return null;
    return safeUrl(config.cartRoutes[name])?.href || null;
  }

  function productPath(kind, handle) {
    if (!['products', 'collections'].includes(kind)
      || typeof handle !== 'string'
      || !/^[a-z0-9][a-z0-9_-]{0,254}$/i.test(handle)) return null;
    return route(`${kind}/${encodeURIComponent(handle)}`);
  }

  function abortError(message = 'Request was aborted.') {
    const error = new Error(message);
    error.name = 'AbortError';
    return error;
  }

  function abortWithReason(controller, message) {
    controller.abort();
    const error = new Error(message);
    error.preserveAbortReason = true;
    throw error;
  }

  function isKnownShopifyJsonRoute(url, method) {
    const hasExactQueryKeys = (allowedKeys) => {
      const actual = [...url.searchParams.keys()].sort();
      const expected = [...allowedKeys].sort();
      return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
    };
    if (method === 'POST') {
      return ['add', 'change', 'update'].some((name) => (
        safeUrl(config?.cartRoutes?.[name])?.href === url.href
      ));
    }
    if (method !== 'GET') return false;
    if (safeUrl(config?.cartRoutes?.cart)?.href === url.href) return true;

    const localeRoot = safeUrl(root);
    if (!localeRoot || !url.pathname.startsWith(localeRoot.pathname)) return false;
    const relativePath = url.pathname.slice(localeRoot.pathname.length);
    const productMatch = relativePath.match(/^products\/([^/]+)\.js$/i);
    if (productMatch && !url.search) {
      const canonicalProductJson = safeUrl(`${productPath('products', productMatch[1]) || ''}.js`);
      if (canonicalProductJson?.href === url.href) return true;
    }

    const predictiveEndpoint = safeUrl(config?.predictiveSearchEndpoint);
    if (predictiveEndpoint) {
      const predictivePath = `${predictiveEndpoint.pathname.replace(/\/$/, '')}.json`;
      if (url.pathname === predictivePath && hasExactQueryKeys([
        'q', 'resources[limit]', 'resources[limit_scope]', 'resources[type]', 'resources[options][unavailable_products]',
      ])) return true;
    }

    const recommendationsEndpoint = safeUrl(route('recommendations/products.json'));
    return !!recommendationsEndpoint && url.pathname === recommendationsEndpoint.pathname
      && hasExactQueryKeys(['product_id', 'limit', 'intent']);
  }

  async function requestJSON(raw, options = {}) {
    if (!configValid) throw new Error('Client request configuration is invalid.');
    const url = safeUrl(raw);
    if (!url) throw new Error('Request URL is not an approved same-origin URL.');
    const method = String(options.method || 'GET').toUpperCase();
    if (!['GET', 'POST'].includes(method) || (method === 'GET' && options.body !== undefined)) {
      throw new Error('Only JSON GET and POST requests are supported.');
    }
    const controller = new AbortController();
    const callerSignal = options.signal;
    if (callerSignal?.aborted) throw abortError();
    const forwardAbort = () => controller.abort();
    callerSignal?.addEventListener('abort', forwardAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), limits.requestTimeoutMs);
    try {
      const response = await fetch(url.href, {
        ...options,
        method,
        signal: controller.signal,
        credentials: 'same-origin',
        redirect: 'error',
      });
      if (controller.signal.aborted) throw abortError();
      if (!response.ok) abortWithReason(controller, `Request failed (${response.status}).`);
      const contentType = response.headers?.get('content-type') || '';
      // Shopify's documented JSON endpoints can respond with text/javascript.
      // Permit it only on the known cart, product, predictive-search, and
      // recommendation JSON routes; bounded JSON.parse below never evaluates it.
      const declaredJson = /\bjson\b/i.test(contentType);
      const shopifyLegacyJsonMime = isKnownShopifyJsonRoute(url, method)
        && /^text\/javascript(?:\s*;|$)/i.test(contentType.trim());
      if (!declaredJson && !shopifyLegacyJsonMime) abortWithReason(controller, 'Response did not declare JSON content.');
      const declaredLength = Number(response.headers?.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > limits.maxResponseBytes) {
        abortWithReason(controller, 'Response exceeded the configured size limit.');
      }
      if (!response.body?.getReader || typeof TextDecoder !== 'function') {
        abortWithReason(controller, 'Response streaming is unavailable.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const chunks = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > limits.maxResponseBytes) {
          controller.abort();
          await reader.cancel().catch(() => {});
          const error = new Error('Response exceeded the configured size limit.');
          error.preserveAbortReason = true;
          throw error;
        }
        chunks.push(decoder.decode(value, { stream: true }));
      }
      chunks.push(decoder.decode());
      const text = chunks.join('');
      try {
        if (controller.signal.aborted) throw abortError();
        return JSON.parse(text);
      } catch (_error) {
        throw new Error('Response was not valid JSON.');
      }
    } catch (error) {
      if (controller.signal.aborted && !error?.preserveAbortReason) throw abortError('Request was aborted or timed out.');
      throw error;
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', forwardAbort);
    }
  }

  // Cart writes are serialized across every storefront component. A failed
  // write is never replayed: first read the cart while the queue is held. If
  // that reconciliation also fails, later writes remain blocked until a new
  // successful cart read establishes current state.
  let cartQueue = Promise.resolve();
  let cartWritesBlocked = false;
  let cartQueueGeneration = 0;
  let pendingCartOperations = 0;
  function validCartSnapshot(cart) {
    if (!isRecord(cart) || !Array.isArray(cart.items)
      || !Number.isSafeInteger(cart.item_count) || cart.item_count < 0
      || !Number.isSafeInteger(cart.total_price) || cart.total_price < 0
      || typeof cart.currency !== 'string' || !/^[A-Z]{3}$/.test(cart.currency)) return false;
    let itemCount = 0;
    for (const item of cart.items) {
      if (!isRecord(item) || typeof item.key !== 'string' || item.key.length === 0
        || !Number.isSafeInteger(item.product_id) || item.product_id < 1
        || !Number.isSafeInteger(item.quantity) || item.quantity < 0
        || !Number.isSafeInteger(item.final_line_price) || item.final_line_price < 0) return false;
      itemCount += item.quantity;
      if (!Number.isSafeInteger(itemCount)) return false;
    }
    return itemCount === cart.item_count;
  }
  function validAddedItems(response) {
    const validLine = (item) => isRecord(item)
      && Number.isSafeInteger(item.id) && item.id > 0
      && (typeof item.key === 'string' && item.key.length > 0 || Number.isSafeInteger(item.key) && item.key > 0)
      && Number.isSafeInteger(item.quantity) && item.quantity > 0;
    if (!isRecord(response) || Object.hasOwn(response, 'status')) return false;
    if (Object.hasOwn(response, 'items')) {
      return Array.isArray(response.items) && response.items.length > 0 && response.items.every(validLine);
    }
    return validLine(response);
  }
  function enqueueCartOperation(operation) {
    const result = cartQueue.then(operation, operation);
    cartQueue = result.then(() => undefined, () => undefined);
    return result;
  }
  function mutateCart(write, readFreshCart, validateResponse = null) {
    if (typeof write !== 'function' || typeof readFreshCart !== 'function') {
      return Promise.resolve({ ok: false, reconciled: false, blocked: true });
    }
    if (cartWritesBlocked || pendingCartOperations >= limits.maxPendingCartWrites) {
      return Promise.resolve({ ok: false, reconciled: false, blocked: true });
    }
    const generation = cartQueueGeneration;
    pendingCartOperations += 1;
    return enqueueCartOperation(async () => {
      pendingCartOperations = Math.max(0, pendingCartOperations - 1);
      if (generation !== cartQueueGeneration || cartWritesBlocked) return { ok: false, reconciled: false, blocked: true };
      try {
        const data = await write();
        if (typeof validateResponse === 'function' && !validateResponse(data)) throw new Error('Cart write response was invalid.');
        return { ok: true, data };
      } catch (_writeError) {
        cartWritesBlocked = true;
        cartQueueGeneration += 1;
        try {
          const cart = await readFreshCart();
          if (!validCartSnapshot(cart)) throw new Error('Cart snapshot was invalid.');
          cartWritesBlocked = false;
          return { ok: false, reconciled: true, cart };
        } catch (_readError) {
          return { ok: false, reconciled: false, blocked: true };
        }
      }
    });
  }
  function readCart(readFreshCart) {
    if (typeof readFreshCart !== 'function') return Promise.reject(new Error('Cart reader is unavailable.'));
    if (pendingCartOperations >= limits.maxPendingCartWrites) return Promise.reject(new Error('Cart operation queue is full.'));
    pendingCartOperations += 1;
    return enqueueCartOperation(async () => {
      pendingCartOperations = Math.max(0, pendingCartOperations - 1);
      const cart = await readFreshCart();
      if (!validCartSnapshot(cart)) throw new Error('Cart snapshot was invalid.');
      cartWritesBlocked = false;
      return cart;
    });
  }

  window.KGClient = Object.freeze({
    config: Object.freeze(config && typeof config === 'object' ? config : {}),
    configValid,
    limits,
    safeUrl,
    route,
    cartRoute,
    productPath,
    requestJSON,
    mutateCart,
    readCart,
    cartWritesBlocked: () => cartWritesBlocked,
    isAbortError: (error) => error?.name === 'AbortError',
    isCartSnapshot: validCartSnapshot,
    isAddedItems: validAddedItems,
  });
})();
