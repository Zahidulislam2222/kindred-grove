'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertNoArguments,
  loadScenarioConfig,
  project,
  validateHarness,
  validateModel,
  validateScenarioConfig,
} = require('../../scripts/capacity/model.cjs');
const { runLocalHarness } = require('../../scripts/capacity/local-harness.cjs');

test('projection matches the documented 10k, 100k and 1M workload table', () => {
  const config = loadScenarioConfig();
  const result = project(config.model);
  assert.equal(result.label, 'PROJECTED');
  assert.deepEqual(result.rows, [
    { activeVisitors: 10000, pagesPerSecond: 1000, staticEdgeRequestsPerSecond: 8000,
      staticMissesPerSecond: 400, cartWritesPerSecond: 50, checkoutStartsPerSecond: 10,
      burst: { pagesPerSecond: 3000, staticEdgeRequestsPerSecond: 24000,
        staticMissesPerSecond: 1200, cartWritesPerSecond: 150, checkoutStartsPerSecond: 30 } },
    { activeVisitors: 100000, pagesPerSecond: 10000, staticEdgeRequestsPerSecond: 80000,
      staticMissesPerSecond: 4000, cartWritesPerSecond: 500, checkoutStartsPerSecond: 100,
      burst: { pagesPerSecond: 30000, staticEdgeRequestsPerSecond: 240000,
        staticMissesPerSecond: 12000, cartWritesPerSecond: 1500, checkoutStartsPerSecond: 300 } },
    { activeVisitors: 1000000, pagesPerSecond: 100000, staticEdgeRequestsPerSecond: 800000,
      staticMissesPerSecond: 40000, cartWritesPerSecond: 5000, checkoutStartsPerSecond: 1000,
      burst: { pagesPerSecond: 300000, staticEdgeRequestsPerSecond: 2400000,
        staticMissesPerSecond: 120000, cartWritesPerSecond: 15000, checkoutStartsPerSecond: 3000 } },
  ]);
});

test('projection responds linearly to traffic and cache-hit assumptions', () => {
  const model = structuredClone(loadScenarioConfig().model);
  const baseline = project(model).rows[0];
  model.activeVisitors = [20000];
  const doubled = project(model).rows[0];
  assert.equal(doubled.pagesPerSecond, baseline.pagesPerSecond * 2);
  model.staticCacheHitFraction = 0;
  assert.equal(project(model).rows[0].staticMissesPerSecond, project(model).rows[0].staticEdgeRequestsPerSecond);
  model.staticCacheHitFraction = 1;
  assert.equal(project(model).rows[0].staticMissesPerSecond, 0);
});

test('projection rejects finite inputs whose intermediate or burst outputs overflow', () => {
  const base = loadScenarioConfig().model;
  const intermediateOverflow = { ...structuredClone(base), secondsBetweenPageViews: Number.MIN_VALUE,
    staticRequestsPerPageView: Number.MAX_SAFE_INTEGER, activeVisitors: [Number.MAX_SAFE_INTEGER] };
  assert.throws(() => project(intermediateOverflow), /outside the finite numeric range/);

  const burstOverflow = { ...structuredClone(base), secondsBetweenPageViews: 1,
    staticRequestsPerPageView: 1, burstMultiplier: Number.MAX_VALUE, activeVisitors: [Number.MAX_SAFE_INTEGER] };
  assert.throws(() => project(burstOverflow), /outside the finite numeric range/);
});

test('model rejects non-finite, non-positive, invalid-ratio and unsafe scenario values', () => {
  const base = loadScenarioConfig().model;
  for (const [field, value] of [
    ['secondsBetweenPageViews', Number.NaN],
    ['secondsBetweenPageViews', 0],
    ['burstMultiplier', -1],
    ['staticCacheHitFraction', 1.01],
    ['cartMutationsPerPageView', -0.01],
    ['checkoutStartsPerPageView', Infinity],
    ['activeVisitors', [10000, 1.5]],
  ]) {
    const model = { ...structuredClone(base), [field]: value };
    assert.throws(() => validateModel(model), { name: /RangeError|TypeError/ });
  }
});

test('harness enforces configured request, concurrency, timeout, duration and delay caps', () => {
  const config = loadScenarioConfig();
  const base = config.harness;
  for (const override of [
    { requests: base.safetyCaps.maxRequests + 1 },
    { concurrency: base.safetyCaps.maxConcurrency + 1 },
    { requestTimeoutMs: base.safetyCaps.maxRequestTimeoutMs + 1 },
    { maxDurationMs: base.safetyCaps.maxDurationMs + 1 },
    { syntheticDelayMs: base.safetyCaps.maxSyntheticDelayMs + 1 },
    { requests: -1 },
    { failEvery: Number.NaN },
  ]) {
    assert.throws(() => validateHarness({ ...base, ...override }));
  }
  assert.throws(() => validateScenarioConfig({ ...config, targetUrl: 'http://example.invalid' }), /unsupported fields/i);
});

test('tool rejects command-line target arguments before any server starts', () => {
  assert.doesNotThrow(() => assertNoArguments([]));
  assert.throws(() => assertNoArguments(['https://example.invalid']), /no command-line arguments or target URLs/);
});

test('bounded local synthetic run reports latency, throughput and closes its server', async () => {
  const config = structuredClone(loadScenarioConfig());
  config.harness = { ...config.harness, requests: 24, concurrency: 4, requestTimeoutMs: 200, maxDurationMs: 2000 };
  const result = await runLocalHarness(config);
  assert.equal(result.label, 'LOCAL_MOCK_NOT_SHOPIFY');
  assert.equal(result.workload.requestsAttempted, 24);
  assert.equal(result.results.successes, 24);
  assert.equal(result.results.errors, 0);
  assert.ok(result.results.peakInFlight > 0 && result.results.peakInFlight <= 4);
  assert.ok(result.results.throughputRequestsPerSecond > 0);
  assert.ok(result.results.latencyMs.p50 >= 0);
  assert.ok(result.results.latencyMs.p95 >= result.results.latencyMs.p50);
  assert.ok(result.results.latencyMs.p99 >= result.results.latencyMs.p95);
  assert.equal(result.results.serverClosed, true);
});

test('synthetic failures and request timeouts are counted and cleaned up', async () => {
  const failing = structuredClone(loadScenarioConfig());
  failing.harness = { ...failing.harness, requests: 10, concurrency: 2, requestTimeoutMs: 200, maxDurationMs: 2000, failEvery: 2 };
  const failureResult = await runLocalHarness(failing);
  assert.equal(failureResult.results.successes, 5);
  assert.equal(failureResult.results.errors, 5);
  assert.equal(failureResult.results.serverClosed, true);

  const timingOut = structuredClone(loadScenarioConfig());
  timingOut.harness = { ...timingOut.harness, requests: 4, concurrency: 2, requestTimeoutMs: 10,
    maxDurationMs: 1000, syntheticDelayMs: 100 };
  const timeoutResult = await runLocalHarness(timingOut);
  assert.equal(timeoutResult.results.errors, 4);
  assert.equal(timeoutResult.results.serverClosed, true);
});

test('global duration limit stops the run before its configured request total', async () => {
  const config = structuredClone(loadScenarioConfig());
  config.harness = { ...config.harness, requests: 40, concurrency: 4, requestTimeoutMs: 1000,
    maxDurationMs: 50, syntheticDelayMs: 250 };
  const result = await runLocalHarness(config);
  assert.equal(result.workload.deadlineReached, true);
  assert.ok(result.workload.requestsAttempted < config.harness.requests);
  assert.ok(result.results.durationMs < config.harness.maxDurationMs + 250);
  assert.equal(result.results.serverClosed, true);
});
