/* Shopify Customer Privacy API adapter. Optional theme processing is deny-by-default. */
(function () {
  'use strict';

  if (window.KGPrivacy) return;

  var config = {};
  try {
    var configElement = document.getElementById('kg-privacy-config');
    config = JSON.parse(configElement && configElement.dataset ? configElement.dataset.config || '{}' : '{}');
  } catch (_error) {
    config = {};
  }

  function isValidConfiguration(value) {
    var keys = value && value.storageKeys;
    var recent = value && value.recentlyViewed;
    var flags = value && value.featureFlags;
    var routes = value && value.routes;
    var privacyProvider = value && value.providers && value.providers.shopifyCustomerPrivacy;
    var feature = privacyProvider && privacyProvider.feature;
    var keyNames = ['featureFlagVisitor', 'featureFlagAssignments', 'featureFlagOverridePrefix', 'recentlyViewed', 'legacyQuizAnswers', 'legacyAnnouncementDismissalPrefix'];
    var routeNames = ['productJsonTemplate', 'productPageTemplate', 'collectionTemplate', 'allProductsCollectionPath'];
    if (!value || value.optionalTelemetryEnabled !== false) return false;
    if (!Number.isSafeInteger(value.apiLoadTimeoutMs) || value.apiLoadTimeoutMs <= 0) return false;
    if (!Number.isSafeInteger(value.apiRetryIntervalMs) || value.apiRetryIntervalMs <= 0) return false;
    if (!privacyProvider || !Number.isSafeInteger(privacyProvider.metadataMaxChars) || privacyProvider.metadataMaxChars <= 0
      || JSON.stringify(privacyProvider).length > privacyProvider.metadataMaxChars) return false;
    if (!feature || !Number.isSafeInteger(feature.nameMaxLength) || feature.nameMaxLength <= 0
      || !Number.isSafeInteger(feature.versionMaxLength) || feature.versionMaxLength <= 0
      || typeof feature.name !== 'string' || feature.name.length > feature.nameMaxLength || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(feature.name)
      || typeof feature.version !== 'string' || feature.version.length > feature.versionMaxLength || !/^\d+\.\d+$/.test(feature.version)) return false;
    if (!keys || keyNames.some(function (key) { return typeof keys[key] !== 'string' || !keys[key]; })) return false;
    if (!/^kg-announce-[a-z0-9-]*$/.test(keys.legacyAnnouncementDismissalPrefix)) return false;
    if (!recent || !Number.isSafeInteger(recent.maxEntries) || recent.maxEntries < 1) return false;
    if (!Number.isSafeInteger(recent.retentionDays) || recent.retentionDays < 1) return false;
    if (!Number.isSafeInteger(recent.displayDefault) || recent.displayDefault < 1 || recent.displayDefault > recent.maxEntries) return false;
    if (!flags || !Number.isFinite(flags.defaultRollout) || flags.defaultRollout < 0 || flags.defaultRollout > 100) return false;
    if (!Array.isArray(flags.defaultVariants) || flags.defaultVariants.length === 0 || typeof flags.urlOverrideParameter !== 'string' || !flags.urlOverrideParameter) return false;
    if (!routes || routeNames.some(function (route) { return typeof routes[route] !== 'string' || routes[route].charAt(0) !== '/'; })) return false;
    if (!routes.productJsonTemplate.includes('{handle}') || !routes.productPageTemplate.includes('{handle}') || !routes.collectionTemplate.includes('{handle}')) return false;
    return true;
  }

  var configValid = isValidConfiguration(config);

  function clearLegacyAnnouncementDismissals() {
    if (!configValid) return;
    try {
      var storage = window.localStorage;
      var prefix = config.storageKeys.legacyAnnouncementDismissalPrefix;
      var keys = [];
      for (var index = 0; index < storage.length; index += 1) {
        var key = storage.key(index);
        if (typeof key === 'string' && key.indexOf(prefix) === 0) keys.push(key);
      }
      keys.forEach(function (key) { storage.removeItem(key); });
    } catch (_error) { /* storage may be unavailable; consent remains deny-by-default */ }
  }

  clearLegacyAnnouncementDismissals();

  var purposes = {
    preferences: { consent: 'preferences', allowed: 'preferencesProcessingAllowed' },
    analytics: { consent: 'analytics', allowed: 'analyticsProcessingAllowed' },
    marketing: { consent: 'marketing', allowed: 'marketingAllowed' },
    sale_of_data: { consent: 'sale_of_data', allowed: 'saleOfDataAllowed' }
  };
  var listeners = new Set();
  var loaded = false;
  var settled = false;
  var loadTimer = null;
  var resolveReady;
  var ready = new Promise(function (resolve) { resolveReady = resolve; });

  function privacySignalsBlock(purpose) {
    if (purpose !== 'analytics' && purpose !== 'marketing' && purpose !== 'sale_of_data') return false;
    var nav = window.navigator || {};
    var dnt = nav.doNotTrack === '1' || nav.doNotTrack === 'yes'
      || nav.msDoNotTrack === '1' || window.doNotTrack === '1' || window.doNotTrack === 'yes';
    var gpc = nav.globalPrivacyControl === true || window.globalPrivacyControl === true;
    return dnt || gpc;
  }

  function allowed(purpose) {
    var spec = purposes[purpose];
    if (!spec || !loaded || !configValid || privacySignalsBlock(purpose)) return false;
    try {
      var privacy = window.Shopify && window.Shopify.customerPrivacy;
      if (!privacy || typeof privacy.currentVisitorConsent !== 'function' || typeof privacy[spec.allowed] !== 'function') return false;
      var consent = privacy.currentVisitorConsent();
      return !!consent && consent[spec.consent] === 'yes' && privacy[spec.allowed]() === true;
    } catch (_error) {
      return false;
    }
  }

  function snapshot() {
    return {
      preferences: allowed('preferences'),
      analytics: allowed('analytics'),
      marketing: allowed('marketing'),
      sale_of_data: allowed('sale_of_data')
    };
  }

  function publish(reason) {
    var current = snapshot();
    listeners.forEach(function (listener) {
      try { listener(current); } catch (_error) { /* one listener cannot block others */ }
    });
    try {
      if (typeof window.CustomEvent === 'function') {
        document.dispatchEvent(new window.CustomEvent('kg:privacy:change', { detail: { allowed: current, reason: reason } }));
      }
    } catch (_error) { /* DOM event support is optional for non-browser harnesses */ }
  }

  function settle(error) {
    if (settled) return;
    settled = true;
    loaded = !error && configValid && !!(window.Shopify && window.Shopify.customerPrivacy);
    if (loadTimer !== null) window.clearTimeout(loadTimer);
    resolveReady(loaded);
    publish(loaded ? 'ready' : 'load_failed');
  }

  function onConsentCollected() {
    publish('consent_changed');
  }

  document.addEventListener('visitorConsentCollected', onConsentCollected);

  window.KGPrivacy = {
    ready: ready,
    config: configValid ? config : null,
    configValid: configValid,
    allowed: allowed,
    snapshot: snapshot,
    subscribe: function (listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.add(listener);
      try { listener(snapshot()); } catch (_error) { /* ignore subscriber failure */ }
      return function () { listeners.delete(listener); };
    }
  };

  if (!configValid) {
    settle(new Error('privacy_api_unavailable'));
    return;
  }

  var deadline = Date.now() + config.apiLoadTimeoutMs;
  var featureLoadStarted = false;
  loadTimer = window.setTimeout(function () { settle(new Error('privacy_api_timeout')); }, config.apiLoadTimeoutMs);
  function waitForShopifyFeatureLoader() {
    if (settled) return;
    if (window.Shopify && typeof window.Shopify.loadFeatures === 'function') {
      if (featureLoadStarted) return;
      featureLoadStarted = true;
      try {
        window.Shopify.loadFeatures([{ name: config.providers.shopifyCustomerPrivacy.feature.name, version: config.providers.shopifyCustomerPrivacy.feature.version }], function (error) {
          settle(error || null);
        });
      } catch (_error) {
        settle(new Error('privacy_api_load_failed'));
      }
      return;
    }
    if (Date.now() >= deadline) {
      settle(new Error('privacy_api_unavailable'));
      return;
    }
    window.setTimeout(waitForShopifyFeatureLoader, config.apiRetryIntervalMs);
  }
  waitForShopifyFeatureLoader();
})();
