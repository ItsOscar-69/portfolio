import { test, expect } from '@playwright/test';

test('the 3D stage starts and the next-project grid goes live', async ({ page }) => {
  const crashes = [];
  page.on('pageerror', (e) => crashes.push(e.message));
  await page.goto('./');
  await expect(page.locator('html')).toHaveClass(/webgl/);
  await page.evaluate(() => document.getElementById('next').scrollIntoView());
  await expect(page.locator('#next')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(crashes).toEqual([]);
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the 3D stage is skipped and posters stay', async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(1000);
    await expect(page.locator('html')).not.toHaveClass(/webgl/);
  });
});

test('without WebGL the page falls back to posters', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  await page.goto('./');
  await page.waitForTimeout(1000);
  await expect(page.locator('html')).not.toHaveClass(/webgl/);
  await expect(page.locator('.hero__count')).toBeVisible();
});

test('still mode renders a single world for posters', async ({ page }) => {
  await page.goto('./?still=next&tier=high');
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
});
