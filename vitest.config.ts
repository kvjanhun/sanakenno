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
    exclude: ['node_modules', '.claude', 'tests/e2e', 'tests/pwa', 'packages'],
    silent: process.env.VERBOSE !== 'true',
    reporters: process.env.VERBOSE === 'true' ? ['default'] : ['dot'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'server/db/connection.ts',
        'server/puzzle-engine.ts',
        'server/puzzle-suggestions.ts',
        'server/routes/achievement.ts',
        'server/routes/puzzle.ts',
        'server/routes/word-find.ts',
        'packages/shared/src/**/*.ts',
        'packages/web/src/hooks/useGameTimer.ts',
        'packages/web/src/hooks/useMidnightRollover.ts',
        'packages/web/src/store/usePaletteStore.ts',
        'packages/web/src/store/useThemePreferenceStore.ts',
        'packages/web/src/utils/**/*.ts',
        'packages/web/src/platform/**/*.ts',
        'packages/web/pwa.config.js',
      ],
      exclude: [
        '**/*.d.ts',
        'server/assets/**',
        'server/data/**',
        'server/scripts/**',
        'server/deploy-sanakenno.sh',
        'packages/shared/src/honeycomb-theme.ts',
        'packages/shared/src/kotus.ts',
        'packages/shared/src/platform-types.ts',
        'packages/web/src/**/*.tsx',
        'packages/web/src/components/**',
        'packages/web/src/dev.ts',
        'packages/web/src/utils/hash.ts',
        'packages/web/src/utils/palette.ts',
        'packages/web/src/main.tsx',
        'packages/mobile/**',
        'scripts/**',
        'tests/**',
      ],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
