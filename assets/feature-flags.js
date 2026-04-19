/**
 * Kindred Grove — client-side feature flags.
 *
 * Exposes `window.KG_FF` with three methods:
 *   KG_FF.get(name)        -> raw bucketed value (string | boolean | null if unknown)
 *   KG_FF.isEnabled(name)  -> boolean; true if the bucket resolves to 'on' or true
 *   KG_FF.variant(name)    -> string | null; the variant label for this visitor
 *
 * Storage:
 *   localStorage['kg_ff_visitor']      -> stable visitor UUID
 *   localStorage['kg_ff_assignments']  -> JSON map { name -> variant }
 *
 * Overrides (highest → lowest):
 *   1. URL param ?kg_ff=name,variant      -> forced for this page view (no persistence)
 *   2. URL param ?kg_ff=name              -> forces the second variant (convenience)
 *   3. localStorage 'kg_ff_override:<name>' (set by devs via console)
 *   4. Deterministic hash bucketing
 *   5. Flag default
 *
 * DNT: if navigator.doNotTrack === '1' (or window.doNotTrack === '1'), every
 * call returns the default and NOTHING is written to localStorage.
 *
 * Threat model: do NOT gate pricing, availability, or checkout content.
 * Any visitor can set ?kg_ff=.
 *
 * Loaded synchronously in <head> so Liquid + later scripts can read flags
 * before first paint without flicker.
 */
(function () {
  'use strict';

  var LS_VISITOR = 'kg_ff_visitor';
  var LS_ASSIGN = 'kg_ff_assignments';
  var LS_OVERRIDE_PREFIX = 'kg_ff_override:';

  var dnt = (typeof navigator !== 'undefined' && navigator.doNotTrack === '1')
         || (typeof window !== 'undefined' && window.doNotTrack === '1');

  var defs = parseDefs(window.__KG_FF_DEFS__);

  var store = safeStore();
  var visitorId = dnt ? 'anon' : ensureVisitorId(store);
  var urlOverrides = parseUrlOverrides();
  var assignments = dnt ? {} : readAssignments(store);

  function parseDefs(raw) {
    try {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string' && raw.trim()) return JSON.parse(raw);
    } catch (err) {
      if (window.Sentry) window.Sentry.captureMessage('KG_FF: bad definitions JSON', 'warning');
    }
    return [];
  }

  function safeStore() {
    try {
      var probe = '__kg_ff_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (_err) {
      return null;
    }
  }

  function ensureVisitorId(ls) {
    if (!ls) return 'anon';
    var id = ls.getItem(LS_VISITOR);
    if (id) return id;
    id = uuid();
    try { ls.setItem(LS_VISITOR, id); } catch (_e) { /* ignore */ }
    return id;
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var hex = '0123456789abcdef';
    var out = '';
    for (var i = 0; i < 32; i++) {
      if (i === 8 || i === 12 || i === 16 || i === 20) out += '-';
      out += hex[Math.floor(Math.random() * 16)];
    }
    return out;
  }

  function parseUrlOverrides() {
    var map = {};
    try {
      var params = new URLSearchParams(window.location.search);
      var all = params.getAll('kg_ff');
      all.forEach(function (entry) {
        if (!entry) return;
        var parts = entry.split(',');
        var name = parts[0];
        var variant = parts.length > 1 ? parts[1] : null;
        if (name) map[name] = variant; // null = "force second variant"
      });
    } catch (_e) { /* older browsers */ }
    return map;
  }

  function readAssignments(ls) {
    if (!ls) return {};
    try {
      var raw = ls.getItem(LS_ASSIGN);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function writeAssignments() {
    if (!store || dnt) return;
    try { store.setItem(LS_ASSIGN, JSON.stringify(assignments)); } catch (_e) { /* quota */ }
  }

  function findDef(name) {
    for (var i = 0; i < defs.length; i++) if (defs[i] && defs[i].name === name) return defs[i];
    return null;
  }

  // FNV-1a 32-bit hash — tiny, deterministic, good enough for bucketing.
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h;
  }

  function bucket(name, def) {
    var variants = Array.isArray(def.variants) && def.variants.length > 0
      ? def.variants
      : [false, true];
    var rollout = typeof def.rollout === 'number' ? def.rollout : 100;
    var roll = hash('roll:' + name + ':' + visitorId) % 100;
    if (roll >= rollout) return def.hasOwnProperty('default') ? def.default : variants[0];
    var idx = hash('pick:' + name + ':' + visitorId) % variants.length;
    return variants[idx];
  }

  function resolve(name) {
    // 1. URL override
    if (Object.prototype.hasOwnProperty.call(urlOverrides, name)) {
      var forced = urlOverrides[name];
      if (forced !== null) return forced;
      var def0 = findDef(name);
      if (def0 && Array.isArray(def0.variants) && def0.variants.length > 1) return def0.variants[1];
      return true;
    }
    // 2. localStorage dev override
    if (store) {
      try {
        var o = store.getItem(LS_OVERRIDE_PREFIX + name);
        if (o !== null) return o;
      } catch (_e) { /* ignore */ }
    }
    // 3. cached assignment
    if (Object.prototype.hasOwnProperty.call(assignments, name)) return assignments[name];
    // 4. bucket from definition
    var def = findDef(name);
    if (!def) return null;
    if (dnt) return def.hasOwnProperty('default') ? def.default : null;
    var value = bucket(name, def);
    assignments[name] = value;
    writeAssignments();
    reportExposure(name, value);
    return value;
  }

  function reportExposure(name, value) {
    try {
      var payload = { flag_name: name, flag_value: String(value), visitor_id: visitorId };
      if (typeof window.gtag === 'function') window.gtag('event', 'flag_exposure', payload);
      else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'flag_exposure', params: payload });
    } catch (_e) { /* non-critical */ }
  }

  window.KG_FF = {
    get: function (name) { return resolve(name); },
    isEnabled: function (name) {
      var v = resolve(name);
      if (v === true) return true;
      if (typeof v === 'string') return v === 'on' || v === 'true' || v === '1';
      return !!v;
    },
    variant: function (name) {
      var v = resolve(name);
      return v == null ? null : String(v);
    },
    // For Liquid-injected definitions + dev-tools inspection
    _defs: defs,
    _visitorId: visitorId,
    _dnt: dnt
  };
})();
