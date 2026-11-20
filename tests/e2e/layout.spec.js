import { test, expect } from '@playwright/test';

const SIZES = [[375, 812], [812, 375], [667, 375], [640, 360], [768, 1024], [1000, 900], [1440, 900]];
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const [width, height] of SIZES) {
  test(`at ${width}×${height} no intro text runs under the top bar or the pill`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./?posters');
    const ids = await page.locator('section.scene.chapter').evaluateAll((els) => els.map((el) => el.id));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      await page.evaluate((el) => {
        const scene = document.getElementById(el);
        window.scrollTo(0, scene.getBoundingClientRect().top + window.scrollY + 10);
      }, id);
      await page.waitForTimeout(200);
      const { bar, pill, items } = await page.evaluate((el) => {
        const box = (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        const frame = document.querySelector(`#${el} .scene__frame`);
        const items = Array.from(frame.children)
          .filter((n) => !n.matches('.scene__poster, picture, .mirror__ascii') && n.getClientRects().length)
          .map((n) => ({ name: n.className || n.tagName, box: box(n) }));
        const pillEl = document.querySelector('.pill');
        return { bar: box(document.querySelector('.topbar')), pill: pillEl && !pillEl.hidden ? box(pillEl) : null, items };
      }, id);
      for (const it of items) {
        expect(overlaps(it.box, bar), `${id}: ${it.name} runs under the top bar`).toBe(false);
        if (pill) expect(overlaps(it.box, pill), `${id}: ${it.name} runs under the pill`).toBe(false);
      }
    }
  });
}

test('the intro frame uses the small viewport height, so phone toolbars never cover its text', async ({ page }) => {
  await page.goto('./?posters');
  const height = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === '.scene__frame' && rule.style.height) return rule.style.height;
      }
    }
    return null;
  });
  expect(height).toBe('100svh');
});
