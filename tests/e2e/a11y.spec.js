import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

// axe-core is injected from node_modules, so no request leaves the machine.
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

async function violations(page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  });
}

const CASES = [
  ['the page', './', {}],
  ['the page with reduced motion', './', { contextOptions: { reducedMotion: 'reduce' } }],
  ['the page on a phone', './', { viewport: { width: 375, height: 812 } }],
  ['the HALCYON copy', './halcyon/', {}],
];
for (const [name, path, options] of CASES) {
  test.describe(name, () => {
    test.use(options);
    test(`axe finds no violations in ${name}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(2000);
      expect(await violations(page)).toEqual([]);
    });
  });
}

test('axe finds no violations with the chapter menu open', async ({ page }) => {
  await page.goto('./');
  await page.locator('.topbar__projects').click();
  await expect(page.locator('#chapter-menu')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
