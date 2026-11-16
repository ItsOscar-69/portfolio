import fs from 'node:fs/promises';
import { launch } from './lib/browser.mjs';
import { serveDir } from './lib/static-server.mjs';

await fs.mkdir('raw/shots', { recursive: true });
const server = await serveDir('public');
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => { try { sessionStorage.setItem('hs-booted', '1'); } catch { /* blocked */ } });
  await page.goto(`${server.url}/halcyon/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'raw/shots/halcyon-hero.png' });
  console.log('captured raw/shots/halcyon-hero.png');
  for (const [id, name] of [['sec-02', 'seraph'], ['sec-06', 'terms']]) {
    await page.evaluate((sel) => document.getElementById(sel).scrollIntoView({ block: 'start' }), id);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `raw/shots/halcyon-${name}.png` });
    console.log(`captured raw/shots/halcyon-${name}.png`);
  }
} finally {
  await browser.close();
  await server.close();
}
