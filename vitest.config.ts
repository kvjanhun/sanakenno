import { defineConfig } from 'vitest/config';

if (process.env.VERBOSE !== 'true') {
  process.env.LOG_LEVEL = 'silent';
}

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    passWithNoTests: true,
    exclude: ['node_modules', '.claude', 'tests/e2e', 'packages'],
    silent: process.env.VERBOSE !== 'true',
    reporters: process.env.VERBOSE === 'true' ? ['default'] : ['dot'],
  },
});
