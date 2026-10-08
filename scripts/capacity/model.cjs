'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SCENARIO_PATH = path.join(__dirname, 'scenarios.json');

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireExactKeys(value, expected, name) {
  if (!isRecord(value)) throw new TypeError(`${name} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${name} has missing or unsupported fields`);
  }
}

function positiveFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than zero`);
  }
}

function ratio(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite fraction from 0 to 1`);
  }
}

function validateModel(model) {
  requireExactKeys(model, [
    'secondsBetweenPageViews', 'staticRequestsPerPageView', 'staticCacheHitFraction',
    'cartMutationsPerPageView', 'checkoutStartsPerPageView', 'burstMultiplier', 'activeVisitors',
  ], 'model');
  positiveFinite(model.secondsBetweenPageViews, 'secondsBetweenPageViews');
  if (!Number.isSafeInteger(model.staticRequestsPerPageView) || model.staticRequestsPerPageView <= 0) {
    throw new RangeError('staticRequestsPerPageView must be a positive safe integer');
  }
  positiveFinite(model.burstMultiplier, 'burstMultiplier');
  ratio(model.staticCacheHitFraction, 'staticCacheHitFraction');
  ratio(model.cartMutationsPerPageView, 'cartMutationsPerPageView');
  ratio(model.checkoutStartsPerPageView, 'checkoutStartsPerPageView');
  if (!Array.isArray(model.activeVisitors) || model.activeVisitors.length === 0
      || model.activeVisitors.some(count => !Number.isSafeInteger(count) || count <= 0)) {
    throw new RangeError('activeVisitors must be a non-empty array of positive safe integers');
  }
}

function validateHarness(harness) {
  requireExactKeys(harness, [
    'requests', 'concurrency', 'requestTimeoutMs', 'maxDurationMs',
    'syntheticDelayMs', 'failEvery', 'safetyCaps',
  ], 'harness');
  const capKeys = ['maxRequests', 'maxConcurrency', 'maxRequestTimeoutMs', 'maxDurationMs', 'maxSyntheticDelayMs'];
  requireExactKeys(harness.safetyCaps, capKeys, 'harness.safetyCaps');
  for (const key of capKeys) {
    if (!Number.isSafeInteger(harness.safetyCaps[key]) || harness.safetyCaps[key] <= 0) {
      throw new RangeError(`harness.safetyCaps.${key} must be a positive safe integer`);
    }
  }
  const positiveLimits = [
    ['requests', 'maxRequests'], ['concurrency', 'maxConcurrency'],
    ['requestTimeoutMs', 'maxRequestTimeoutMs'], ['maxDurationMs', 'maxDurationMs'],
  ];
  for (const [name, cap] of positiveLimits) {
    if (!Number.isSafeInteger(harness[name]) || harness[name] <= 0 || harness[name] > harness.safetyCaps[cap]) {
      throw new RangeError(`harness.${name} must be a positive safe integer within its configured safety cap`);
    }
  }
  if (!Number.isSafeInteger(harness.syntheticDelayMs) || harness.syntheticDelayMs < 0
      || harness.syntheticDelayMs > harness.safetyCaps.maxSyntheticDelayMs) {
    throw new RangeError('harness.syntheticDelayMs must be a non-negative safe integer within its configured safety cap');
  }
  if (!Number.isSafeInteger(harness.failEvery) || harness.failEvery < 0 || harness.failEvery > harness.requests) {
    throw new RangeError('harness.failEvery must be zero or a positive request interval no greater than requests');
  }
  return harness;
}

function validateScenarioConfig(config) {
  requireExactKeys(config, ['schemaVersion', 'model', 'harness'], 'scenario config');
  if (config.schemaVersion !== 1) throw new RangeError('Unsupported scenario schemaVersion');
  validateModel(config.model);
  validateHarness(config.harness);
  return config;
}

function loadScenarioConfig() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8'));
  } catch (error) {
    throw new Error('Could not load capacity scenarios JSON', { cause: error });
  }
  return validateScenarioConfig(parsed);
}

function project(model) {
  validateModel(model);
  const { secondsBetweenPageViews: T, staticRequestsPerPageView: S,
    staticCacheHitFraction: H, cartMutationsPerPageView: A,
    checkoutStartsPerPageView: K, burstMultiplier: B } = model;
  const rows = model.activeVisitors.map(C => {
    const finiteRate = (value, name) => {
      if (!Number.isFinite(value)) throw new RangeError(`Projected ${name} is outside the finite numeric range`);
      return Number(value.toPrecision(12));
    };
    const rawPagesPerSecond = C / T;
    const rawStaticEdgeRequestsPerSecond = rawPagesPerSecond * S;
    const rawStaticMissesPerSecond = rawStaticEdgeRequestsPerSecond * (1 - H);
    const rawCartWritesPerSecond = rawPagesPerSecond * A;
    const rawCheckoutStartsPerSecond = rawPagesPerSecond * K;
    return {
      activeVisitors: C,
      pagesPerSecond: finiteRate(rawPagesPerSecond, 'pagesPerSecond'),
      staticEdgeRequestsPerSecond: finiteRate(rawStaticEdgeRequestsPerSecond, 'staticEdgeRequestsPerSecond'),
      staticMissesPerSecond: finiteRate(rawStaticMissesPerSecond, 'staticMissesPerSecond'),
      cartWritesPerSecond: finiteRate(rawCartWritesPerSecond, 'cartWritesPerSecond'),
      checkoutStartsPerSecond: finiteRate(rawCheckoutStartsPerSecond, 'checkoutStartsPerSecond'),
      burst: {
        pagesPerSecond: finiteRate(rawPagesPerSecond * B, 'burst.pagesPerSecond'),
        staticEdgeRequestsPerSecond: finiteRate(rawStaticEdgeRequestsPerSecond * B, 'burst.staticEdgeRequestsPerSecond'),
        staticMissesPerSecond: finiteRate(rawStaticMissesPerSecond * B, 'burst.staticMissesPerSecond'),
        cartWritesPerSecond: finiteRate(rawCartWritesPerSecond * B, 'burst.cartWritesPerSecond'),
        checkoutStartsPerSecond: finiteRate(rawCheckoutStartsPerSecond * B, 'burst.checkoutStartsPerSecond'),
      },
    };
  });
  return { label: 'PROJECTED', assumptions: { ...model }, rows };
}

function assertNoArguments(args) {
  if (args.length !== 0) throw new TypeError('This local tool accepts no command-line arguments or target URLs');
}

if (require.main === module) {
  try {
    assertNoArguments(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(project(loadScenarioConfig().model), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  assertNoArguments,
  loadScenarioConfig,
  project,
  validateHarness,
  validateModel,
  validateScenarioConfig,
};
