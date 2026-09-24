import { defineConfig, devices } from '@playwright/test';
const { readTestConfig } = require('./scripts/config/test-config.cjs');

const testConfig = readTestConfig(process.env);

export default defineConfig({
  testDir: './tests',
  timeout: testConfig.testTimeoutMs,
  expect: { timeout: testConfig.expectTimeoutMs },
  fullyParallel: true,
  forbidOnly: testConfig.isCI,
  retries: testConfig.retries,
  workers: testConfig.workers,
  reporter: testConfig.isCI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'on-failure', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: testConfig.baseUrl,
    // Password-gated storefront runs must never persist authentication steps
    // or entered credentials in traces, screenshots, or recordings.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: testConfig.actionTimeoutMs,
    navigationTimeout: testConfig.navigationTimeoutMs,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
