const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 300_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://abitov.danbel.ru',
    viewport: { width: 1440, height: 1024 },
    screenshot: 'off',
  },
});
