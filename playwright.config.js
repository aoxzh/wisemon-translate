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
    trace: 'retain-on-failure'
  }
});
