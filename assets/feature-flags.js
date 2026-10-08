/* Consent-gated, client-side feature flags. No exposure telemetry is emitted. */
(function () {
  'use strict';

  var config = {};
  var definitions = [];
  var storageKeys = null;
  var analyticsAllowed = false;
  var store = null;
  var assignments = {};
  var overrides = {};
  var urlOverrides = {};
  var bucketId = null;

  function readJsonAttribute(id, attribute, fallback) {
    try {
      var element = document.getElementById(id);
      if (!element || !element.dataset || typeof element.dataset[attribute] !== 'string') return fallback;
      return JSON.parse(element.dataset[attribute]);
    } catch (_error) {
      return fallback;
    }
  }

  config = window.KGPrivacy && window.KGPrivacy.configValid ? window.KGPrivacy.config : {};
  definitions = readJsonAttribute('kg-feature-flags-config', 'json', []);
  if (!Array.isArray(definitions)) {
    try { definitions = typeof definitions === 'string' ? JSON.parse(definitions) : []; } catch (_error) { definitions = []; }
  }
  if (!Array.isArray(definitions)) definitions = [];
  storageKeys = config.storageKeys || null;
  var flagConfig = config.featureFlags || null;

  function findDefinition(name) {
    return definitions.find(function (definition) { return definition && definition.name === name; }) || null;
  }

  function defaultValue(name) {
    var definition = findDefinition(name);
    if (!definition) return null;
    if (Object.prototype.hasOwnProperty.call(definition, 'default')) return definition.default;
    return Array.isArray(definition.variants) && definition.variants.length ? definition.variants[0] : null;
  }

  function acquireStorage() {
    try {
      var storage = window.localStorage;
      var probe = '__kg_preferences_probe__';
      storage.setItem(probe, '1');
      storage.removeItem(probe);
      return storage;
    } catch (_error) {
      return null;
    }
  }

  function removeLegacyKeys() {
    if (!storageKeys) return;
    try {
      var storage = window.localStorage;
      storage.removeItem(storageKeys.featureFlagVisitor);
      storage.removeItem(storageKeys.featureFlagAssignments);
      for (var index = storage.length - 1; index >= 0; index -= 1) {
        var key = storage.key(index);
        if (key && key.indexOf(storageKeys.featureFlagOverridePrefix) === 0) storage.removeItem(key);
      }
    } catch (_error) { /* unavailable/blocked storage fails closed */ }
  }

  function readAssignments() {
    if (!store || !storageKeys) return {};
    try {
      var parsed = JSON.parse(store.getItem(storageKeys.featureFlagAssignments) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function readOverrides() {
    var result = {};
    if (!store || !storageKeys) return result;
    try {
      for (var index = 0; index < store.length; index += 1) {
        var key = store.key(index);
        if (key && key.indexOf(storageKeys.featureFlagOverridePrefix) === 0) {
          result[key.slice(storageKeys.featureFlagOverridePrefix.length)] = store.getItem(key);
        }
      }
    } catch (_error) { /* dev overrides are optional */ }
    return result;
  }

  function saveAssignments() {
    if (!analyticsAllowed || !store || !storageKeys) return;
    try { store.setItem(storageKeys.featureFlagAssignments, JSON.stringify(assignments)); } catch (_error) { /* storage quota */ }
  }

  function ephemeralBucketId() {
    try { return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Math.random()); } catch (_error) { return String(Math.random()); }
  }

  function hash(value) {
    var result = 0x811c9dc5;
    for (var index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = (result + ((result << 1) + (result << 4) + (result << 7) + (result << 8) + (result << 24))) >>> 0;
    }
    return result;
  }

  function bucket(name, definition) {
    var variants = Array.isArray(definition.variants) && definition.variants.length ? definition.variants : flagConfig.defaultVariants;
    var rollout = typeof definition.rollout === 'number' ? Math.max(0, Math.min(100, definition.rollout)) : flagConfig.defaultRollout;
    if (hash('roll:' + name + ':' + bucketId) % 100 >= rollout) return defaultValue(name);
    return variants[hash('pick:' + name + ':' + bucketId) % variants.length];
  }

  function parseUrlOverrides() {
    var result = {};
    try {
      new URLSearchParams(window.location.search).getAll(flagConfig.urlOverrideParameter).forEach(function (entry) {
        var parts = entry.split(',');
        if (parts[0]) result[parts[0]] = parts.length > 1 ? parts[1] : null;
      });
    } catch (_error) { /* unsupported URLSearchParams */ }
    return result;
  }

  function resolve(name) {
    if (!analyticsAllowed) return defaultValue(name);
    if (Object.prototype.hasOwnProperty.call(urlOverrides, name)) {
      var forced = urlOverrides[name];
      if (forced !== null) return forced;
      var definition = findDefinition(name);
      if (definition && Array.isArray(definition.variants) && definition.variants.length > 1) return definition.variants[1];
      return true;
    }
    if (Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name];
    if (Object.prototype.hasOwnProperty.call(assignments, name)) return assignments[name];
    var def = findDefinition(name);
    if (!def) return null;
    var value = bucket(name, def);
    assignments[name] = value;
    saveAssignments();
    return value;
  }

  function publishChange() {
    try {
      if (typeof window.CustomEvent === 'function') window.dispatchEvent(new window.CustomEvent('kg:feature-flags:change'));
    } catch (_error) { /* optional event hook */ }
  }

  function applyPrivacyState() {
    analyticsAllowed = !!(window.KGPrivacy && window.KGPrivacy.allowed('analytics'));
    if (!analyticsAllowed) {
      removeLegacyKeys();
      store = null;
      assignments = {};
      overrides = {};
      urlOverrides = {};
      bucketId = null;
    } else {
      store = acquireStorage();
      assignments = readAssignments();
      overrides = readOverrides();
      urlOverrides = parseUrlOverrides();
      bucketId = store ? getOrCreateBucketId() : ephemeralBucketId();
    }
    publishChange();
  }

  function getOrCreateBucketId() {
    if (!store || !storageKeys) return ephemeralBucketId();
    try {
      var existing = store.getItem(storageKeys.featureFlagVisitor);
      if (existing) return existing;
      var created = ephemeralBucketId();
      store.setItem(storageKeys.featureFlagVisitor, created);
      return created;
    } catch (_error) {
      return ephemeralBucketId();
    }
  }

  var ready = Promise.resolve(window.KGPrivacy && window.KGPrivacy.ready).then(function () {
    applyPrivacyState();
    if (window.KGPrivacy && typeof window.KGPrivacy.subscribe === 'function') window.KGPrivacy.subscribe(applyPrivacyState);
    return true;
  }).catch(function () {
    applyPrivacyState();
    return false;
  });

  window.KG_FF = {
    ready: ready,
    get: resolve,
    isEnabled: function (name) {
      var value = resolve(name);
      if (value === true) return true;
      if (typeof value === 'string') return value === 'on' || value === 'true' || value === '1';
      return !!value;
    },
    variant: function (name) {
      var value = resolve(name);
      return value == null ? null : String(value);
    },
    _defs: definitions
  };
})();
