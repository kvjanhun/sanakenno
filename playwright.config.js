import { defineConfig, devices } from '@playwright/test';

const isVerbose = process.env.VERBOSE === 'true';

if (!isVerbose) {
  process.env.LOG_LEVEL = 'silent';
}

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/helpers.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI runners have 4 vCPUs; tests mock all API routes and get isolated
  // browser contexts, so they parallelise safely. retries above absorbs
  // any load-induced stragglers.
  workers: process.env.CI ? 4 : undefined,
  reporter: isVerbose ? (process.env.CI ? 'list' : 'html') : 'dot',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    timezoneId: 'Europe/Helsinki',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: isVerbose
      ? 'pnpm --filter @sanakenno/web dev'
      : 'LOG_LEVEL=silent pnpm --filter @sanakenno/web dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
