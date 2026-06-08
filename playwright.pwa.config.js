/* global process */
import { defineConfig, devices } from '@playwright/test';

const isVerbose = process.env.VERBOSE === 'true';
const previewCommand =
  'pnpm --dir packages/web exec vite preview --host 127.0.0.1 --port 4173';

if (!isVerbose) {
  process.env.LOG_LEVEL = 'silent';
}

export default defineConfig({
  testDir: './tests/pwa',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: isVerbose ? (process.env.CI ? 'list' : 'html') : 'dot',
  use: {
    baseURL: 'http://127.0.0.1:4173',
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
    command: isVerbose ? previewCommand : `LOG_LEVEL=silent ${previewCommand}`,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
