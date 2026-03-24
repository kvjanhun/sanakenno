import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-console': 'warn',
    },
  },
  {
    files: ['playwright.config.*', 'scripts/**/*', 'server/**/*'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'reports/'],
  },
);
