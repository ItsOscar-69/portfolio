// Renders each scene's world full-screen in still mode and saves it as public/posters/<id>.webp and <id>-portrait.webp.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { preview } from 'vite';
import { launch } from './lib/browser.mjs';
import { projects } from '../src/content/projects.js';
import { BASE } from '../site.config.js';

const PORT = 4174;
const SHAPES = [['', { width: 1600, height: 1000 }], ['-portrait', { width: 900, height: 1600 }]];
const scenes = [['hero', 0.15], ...projects.map((p) => [p.id, 0.85]), ['next', 0.5]];

await fs.mkdir('public/posters', { recursive: true });
const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' });
const browser = await launch();
try {
  for (const [suffix, viewport] of SHAPES) {
    const page = await browser.newPage({ viewport });
    page.on('console', (m) => { if (m.type() === 'error') console.error(`[page] ${m.text()}`); });
    for (const [id, progress] of scenes) {
      await page.goto(`http://localhost:${PORT}${BASE}?still=${id}&p=${progress}&tier=high`);
      await page.waitForFunction(() => document.documentElement.dataset.stillReady, null, { timeout: 120_000 });
      const state = await page.evaluate(() => document.documentElement.dataset.stillReady);
      if (state !== '1') throw new Error(`poster for "${id}${suffix}" failed to render (${state})`);
      const png = await page.locator('canvas.stage').screenshot();
      await sharp(png).webp({ quality: 80 }).toFile(`public/posters/${id}${suffix}.webp`);
      console.log(`poster: public/posters/${id}${suffix}.webp`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  if (typeof server.close === 'function') await server.close();
  else server.httpServer.close();
}
