import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const isProdE2E = process.env.E2E_PROD === '1';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: path.join(process.env.TEMP || process.cwd(), 'test-results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [['html', { outputFolder: path.join(process.env.TEMP || process.cwd(), 'playwright-report') }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: isProdE2E
      ? 'cmd.exe /c "node scripts/start-e2e-prod-server.mjs"'
      : 'cmd.exe /c "npm run dev"',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
