const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests'),
  timeout: 90000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    actionTimeout: 10000,
    // Windows can intermittently lose Playwright's temporary trace file while
    // closing many persistent extension contexts. Keep traces in CI, where the
    // Linux/Xvfb runner is stable, and avoid that local-only artifact failure.
    trace: process.env.CI ? 'retain-on-failure' : 'off'
  }
});
