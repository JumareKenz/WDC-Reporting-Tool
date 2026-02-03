const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: ['**/e2e/**/*.test.js'],

  // Run tests serially — smoke suite is small, ordering matters for state
  workers: 1,

  // Fail fast
  bail: 1,

  // Reporter
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  // Shared settings
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    // Headless in CI, headed locally if PW_HEADED=1
    headless: !process.env.PW_HEADED,
    // Screenshots on failure only
    screenshot: 'only-on-failure',
    // Videos on failure only
    video: 'retain-on-failure',
    // Viewport
    viewport: { width: 1280, height: 720 },
  },

  // Default timeout
  timeout: 15000,
  expect: { timeout: 5000 },

  // Projects: Chrome headless only (fast CI)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
