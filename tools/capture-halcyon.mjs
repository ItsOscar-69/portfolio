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
  const scrollTo = async (id) => {
    await page.evaluate((sel) => document.getElementById(sel).scrollIntoView({ block: 'start' }), id);
    await page.waitForTimeout(2000);
  };
  // SERAPH-9: the side-effects card must not cover the plate, so try 16:10 viewports in order.
  // The live page overlaps the card on the plate by design; this shot nudges it so the plate's numbers show.
  const nudge = await page.addStyleTag({ content: '#sec-02 .effects { margin-left: 24px !important; }' });
  const tried = [];
  let chosen = null;
  for (const [w, h] of [[1600, 1000], [1920, 1200], [1440, 900], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    await scrollTo('sec-02');
    const boxes = await page.evaluate(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
      return { plate: r(document.querySelector('#sec-02 .plate')), card: r(document.querySelector('#sec-02 .effects')), vw: innerWidth, vh: innerHeight };
    });
    const { plate: p, card: c, vw, vh } = boxes;
    const apart = p.x + p.w <= c.x || c.x + c.w <= p.x || p.y + p.h <= c.y || c.y + c.h <= p.y;
    const inside = (b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= vw && b.y + b.h <= vh;
    tried.push({ viewport: `${w}x${h}`, plate: p, card: c });
    if (apart && inside(p) && inside(c)) { chosen = `${w}x${h}`; break; }
  }
  if (!chosen) {
    console.error(JSON.stringify(tried, null, 1));
    throw new Error('SERAPH-9 overlaps at every viewport tried');
  }
  console.log(`SERAPH-9 viewport: ${chosen}`, JSON.stringify(tried[tried.length - 1]));
  await page.screenshot({ path: 'raw/shots/halcyon-seraph.png' });
  console.log('captured raw/shots/halcyon-seraph.png');
  await nudge.evaluate((el) => el.remove());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await scrollTo('sec-06');
  await page.screenshot({ path: 'raw/shots/halcyon-terms.png' });
  console.log('captured raw/shots/halcyon-terms.png');
} finally {
  await browser.close();
  await server.close();
}
