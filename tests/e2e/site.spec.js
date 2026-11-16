import { test, expect } from '@playwright/test';

const LOCAL = new Set(['localhost', '127.0.0.1']);

test('scrolling the whole page logs no errors and calls no third parties', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = [];
  const outside = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.protocol.startsWith('http') && !LOCAL.has(u.hostname)) outside.push(req.url());
  });
  await page.goto('./');
  await expect(page.locator('#top')).toHaveClass(/is-live/, { timeout: 30_000 });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(2000);
  await expect(page.locator('.scene.is-failed')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(outside).toEqual([]);
});

test('with the stage running, a 375px phone has no sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveClass(/webgl/);
  await page.locator('.topbar__projects').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
