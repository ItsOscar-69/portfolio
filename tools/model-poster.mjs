// Saves the ASCII Mirror's 3D viewer, as it looks on the page, as model-poster.webp: the image shown before the
// viewer loads, and instead of it without WebGL. ?posters keeps the 3D stage off, so only the viewer draws.
import sharp from 'sharp';
import { preview } from 'vite';
import { launch } from './lib/browser.mjs';
import { BASE } from '../site.config.js';

const PORT = 4177;
const OUT = 'public/projects/ascii-mirror/model-poster.webp';
const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' });
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on('console', (m) => { if (m.type() === 'error') console.error(`[page] ${m.text()}`); });
  await page.goto(`http://localhost:${PORT}${BASE}?posters`);
  const figure = page.locator('#ascii-mirror .media--model');
  await figure.scrollIntoViewIfNeeded();
  // The page's fixed chrome would be captured over the stage, so hide it for the shot.
  await page.addStyleTag({ content: '.skip, .topbar, .pill, .menu { display: none !important; }' });
  await figure.locator('.model__stage').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => document.querySelector('#ascii-mirror .media--model').classList.contains('is-ready'), null, { timeout: 60_000 });
  await page.waitForTimeout(1_200); // let the poster fade out
  const png = await figure.locator('.model__stage').screenshot();
  await sharp(png).resize({ width: 1200 }).webp({ quality: 82 }).toFile(OUT);
  console.log(`wrote ${OUT}`);
} finally {
  await browser.close();
  if (typeof server.close === 'function') await server.close();
  else server.httpServer.close();
}
