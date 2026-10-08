'use strict';

const http = require('node:http');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const { assertNoArguments, loadScenarioConfig, validateScenarioConfig } = require('./model.cjs');

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];
}

function closeServer(server) {
  return new Promise(resolve => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
    server.closeAllConnections?.();
  });
}

async function runLocalHarness(config = loadScenarioConfig()) {
  validateScenarioConfig(config);
  const settings = config.harness;
  let serverRequestNumber = 0;
  const responseTimers = new Set();
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/synthetic-work') {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    const requestNumber = ++serverRequestNumber;
    const respond = () => {
      responseTimers.delete(timer);
      if (response.destroyed) return;
      if (settings.failEvery > 0 && requestNumber % settings.failEvery === 0) {
        response.writeHead(503, { 'content-type': 'text/plain' }).end('Synthetic failure');
        return;
      }
      response.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' }).end('Synthetic response');
    };
    const timer = setTimeout(respond, settings.syntheticDelayMs);
    responseTimers.add(timer);
  });

  const latencies = [];
  let attempts = 0;
  let successes = 0;
  let errors = 0;
  let inFlight = 0;
  let peakInFlight = 0;
  let deadlineReached = false;
  const controllers = new Set();
  const started = performance.now();
  let durationTimer;
  let serverClosed = false;

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Loopback server did not bind to an ephemeral TCP port');
    const localURL = `http://127.0.0.1:${address.port}/synthetic-work`;
    const deadline = started + settings.maxDurationMs;
    durationTimer = setTimeout(() => {
      deadlineReached = true;
      for (const controller of controllers) controller.abort();
    }, settings.maxDurationMs);

    async function worker() {
      while (attempts < settings.requests && !deadlineReached && performance.now() < deadline) {
        attempts += 1;
        inFlight += 1;
        peakInFlight = Math.max(peakInFlight, inFlight);
        const requestStart = performance.now();
        const controller = new AbortController();
        controllers.add(controller);
        const timeout = setTimeout(() => controller.abort(), settings.requestTimeoutMs);
        try {
          const response = await fetch(localURL, {
            method: 'GET',
            redirect: 'error',
            signal: controller.signal,
            headers: { accept: 'text/plain' },
          });
          await response.arrayBuffer();
          if (response.status === 200) successes += 1;
          else errors += 1;
        } catch {
          errors += 1;
        } finally {
          clearTimeout(timeout);
          controllers.delete(controller);
          inFlight -= 1;
          latencies.push(performance.now() - requestStart);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(settings.concurrency, settings.requests) }, () => worker()));
  } finally {
    clearTimeout(durationTimer);
    for (const controller of controllers) controller.abort();
    for (const timer of responseTimers) clearTimeout(timer);
    responseTimers.clear();
    await closeServer(server);
    serverClosed = true;
  }

  const durationMs = performance.now() - started;
  return {
    label: 'LOCAL_MOCK_NOT_SHOPIFY',
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      logicalCpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    workload: {
      requestsConfigured: settings.requests,
      requestsAttempted: attempts,
      concurrencyConfigured: settings.concurrency,
      requestTimeoutMs: settings.requestTimeoutMs,
      maxDurationMs: settings.maxDurationMs,
      syntheticDelayMs: settings.syntheticDelayMs,
      failEvery: settings.failEvery,
      deadlineReached,
    },
    results: {
      successes,
      errors,
      peakInFlight,
      durationMs: Number(durationMs.toFixed(3)),
      throughputRequestsPerSecond: durationMs > 0 ? Number((attempts * 1000 / durationMs).toFixed(3)) : 0,
      latencyMs: {
        p50: Number(percentile(latencies, 0.50).toFixed(3)),
        p95: Number(percentile(latencies, 0.95).toFixed(3)),
        p99: Number(percentile(latencies, 0.99).toFixed(3)),
      },
      serverClosed,
    },
  };
}

if (require.main === module) {
  try {
    assertNoArguments(process.argv.slice(2));
    runLocalHarness().then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
      .catch(error => {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
      });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { percentile, runLocalHarness };
