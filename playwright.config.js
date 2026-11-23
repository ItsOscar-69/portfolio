import { defineConfig } from '@playwright/test';
import { BASE } from './site.config.js';

const live = process.env.PW_BASE_URL; // e.g. https://itsoscar-69.github.io/ to check the published site
const channel = process.env.PW_CHANNEL || 'msedge';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: live || `http://localhost:4173${BASE}`,
    ...(channel === 'chromium' ? {} : { channel }),
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    viewport: { width: 1440, height: 900 },
  },
  ...(live ? {} : { webServer: { command: 'npm run build && npm run preview', url: `http://localhost:4173${BASE}`, reuseExistingServer: false, timeout: 180_000 } }),
});
