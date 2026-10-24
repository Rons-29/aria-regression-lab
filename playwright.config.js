// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Chromium のみ・固定 viewport。サーバー不要（page.setContent）。
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'results/playwright-report.json' }]],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 800, height: 600 },
        deviceScaleFactor: 1,
      },
    },
  ],
  expect: {
    toHaveScreenshot: {
      // 見た目同一性の検証向け。色変更は差分として検出される想定。
      maxDiffPixels: 0,
      animations: 'disabled',
    },
  },
});
