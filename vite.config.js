import { defineConfig } from 'vite';
import { BASE } from './site.config.js';

export default defineConfig({
  base: BASE,
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 800 },
  server: { port: 5173 },
});
