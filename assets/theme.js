// assets/theme.js — Kindred Grove front-end entry point.
//
// Today's scope (Day 3):
//   - Real User Monitoring: web-vitals v5 → GA4 custom events (or dataLayer fallback).
//
// Web Component registrations for quiz, cart-drawer, predictive-search, etc.
// land in later phases (Day 4 onward). Keep this file small; ship heavier
// features as their own modules when we need them.

(function () {
  'use strict';

  var obs = window.__KG_OBS__ || {};
  var sample = typeof obs.rumSample === 'number' ? obs.rumSample : 100;

  // Sampling: 100% by default on dev, merchant can lower on production.
  if (sample < 100 && Math.random() * 100 >= sample) return;

  // Only hook Web Vitals when either gtag or dataLayer exists — otherwise
  // we'd collect metrics we can't ship anywhere and create a memory-leak
  // risk (web-vitals docs: "do not call more than once per page load").
  function hasReportSink() {
    return typeof window.gtag === 'function' || Array.isArray(window.dataLayer);
  }

  function reportMetric(metric) {
    var payload = {
      value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
      navigation_type: metric.navigationType,
      theme_id: obs.themeId,
      sentry_env: obs.sentryEnv
    };
    if (typeof window.gtag === 'function') {
      window.gtag('event', metric.name, payload);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: 'web_vitals', name: metric.name, params: payload });
    }
  }

  function loadWebVitals() {
    if (!hasReportSink()) return; // nothing to do; don't pay the import cost
    import('https://unpkg.com/web-vitals@5?module').then(function (mod) {
      try {
        mod.onCLS(reportMetric);
        mod.onINP(reportMetric);
        mod.onLCP(reportMetric);
        mod.onFCP(reportMetric);
        mod.onTTFB(reportMetric);
      } catch (err) {
        if (window.Sentry) window.Sentry.captureException(err);
      }
    }).catch(function (err) {
      // Adblock or offline. Fine — metrics are non-critical telemetry.
      if (window.Sentry) window.Sentry.captureMessage('web-vitals load failed: ' + err.message, 'warning');
    });
  }

  if (document.readyState === 'complete') {
    loadWebVitals();
  } else {
    window.addEventListener('load', loadWebVitals, { once: true });
  }
})();
