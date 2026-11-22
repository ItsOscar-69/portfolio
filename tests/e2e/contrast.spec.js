import { test, expect } from '@playwright/test';
import sharp from 'sharp';

// Spec §8.3: text over posters and worlds meets WCAG AA. axe can't judge text over images, so this hides each intro
// line, photographs what is behind it, and compares the text colour with the brightest 5% of that background:
// 4.5:1, or 3:1 for large text (24 px, or 18.66 px bold).
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const TEXT = '.chapter__meta, .chapter__title, .chapter__hook, .hero__count, .hero__links a, .badge';

async function lowContrast(page, viewport, live) {
  const failures = [];
  const ids = await page.locator('.scene').evaluateAll((els) => els.map((el) => el.id).filter((id) => id !== 'next'));
  for (const id of ids) {
    await page.evaluate((el) => {
      const scene = document.getElementById(el);
      const track = scene.querySelector('.scene__track');
      window.scrollTo(0, scene.getBoundingClientRect().top + window.scrollY + (track.offsetHeight - innerHeight) * 0.6);
    }, id);
    if (live) await expect(page.locator(`#${id}`)).toHaveClass(/is-live/, { timeout: 60_000 });
    await page.waitForTimeout(live ? 2500 : 800);
    const items = await page.evaluate(({ el, sel }) => Array.from(document.querySelectorAll(`#${el} .scene__frame :is(${sel})`)).map((n, i) => {
      n.dataset.cx = String(i);
      const r = n.getBoundingClientRect();
      const cs = getComputedStyle(n);
      return { name: n.className.split(' ')[0] || n.tagName, color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), box: { x: r.x, y: r.y, width: r.width, height: r.height } };
    }), { el: id, sel: TEXT });
    const hide = await page.addStyleTag({ content: '[data-cx] { color: transparent !important; border-color: transparent !important; text-decoration-color: transparent !important; }' });
    await page.waitForTimeout(300);
    for (const it of items) {
      const x = Math.max(0, it.box.x);
      const y = Math.max(0, it.box.y);
      const clip = { x, y, width: Math.min(viewport.width, it.box.x + it.box.width) - x, height: Math.min(viewport.height, it.box.y + it.box.height) - y };
      if (clip.width < 2 || clip.height < 2) continue;
      const { data, info } = await sharp(await page.screenshot({ clip })).raw().toBuffer({ resolveWithObject: true });
      const ls = [];
      for (let p = 0; p < data.length; p += info.channels) ls.push(lum(data[p], data[p + 1], data[p + 2]));
      ls.sort((a, b) => a - b);
      const [r, g, b] = it.color.match(/\d+(\.\d+)?/g).map(Number);
      const need = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700) ? 3 : 4.5;
      const got = ratio(lum(r, g, b), ls[Math.floor(ls.length * 0.95)]);
      if (got < need) failures.push(`${id} ${it.name}: ${got.toFixed(2)} < ${need}`);
    }
    await hide.evaluate((node) => node.remove());
    await page.evaluate(() => document.querySelectorAll('[data-cx]').forEach((n) => n.removeAttribute('data-cx')));
  }
  return failures;
}

const RUNS = [
  ['posters on a desktop', { width: 1440, height: 900 }, true, ''],
  ['posters on a phone', { width: 375, height: 812 }, true, ''],
  ['live worlds on a desktop', { width: 1440, height: 900 }, false, '?tier=high'],
  ['live worlds on a phone', { width: 375, height: 812 }, false, '?tier=high'],
];
for (const [name, viewport, reduced, query] of RUNS) {
  test.describe(name, () => {
    test.use({ viewport, contextOptions: reduced ? { reducedMotion: 'reduce' } : {} });
    test(`intro text meets AA contrast over ${name}`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.goto(`./${query}`);
      expect(await lowContrast(page, viewport, !reduced)).toEqual([]);
    });
  });
}
