import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pwaOptions } from './pwa.config.js';

const { version } = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf-8'),
);

export default defineConfig(() => ({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  base: '/',
  plugins: [react(), tailwindcss(), VitePWA(pwaOptions)],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
}));
