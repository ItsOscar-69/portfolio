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

test('the stage stops drawing while a chapter panel fills the screen, and starts again after it', async ({ page }) => {
  await page.addInitScript(() => {
    window.__draws = 0;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      for (const name of ['drawArrays', 'drawElements']) {
        const original = proto[name];
        proto[name] = function (...args) { window.__draws++; return original.apply(this, args); };
      }
    }
  });
  await page.goto('./');
  await page.evaluate(() => document.getElementById('dead-tired').scrollIntoView({ block: 'start' }));
  await expect(page.locator('#dead-tired')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(await page.evaluate(() => document.querySelector('#dead-tired .chapter__panel').offsetHeight)).toBeGreaterThan(1400);
  await page.evaluate(() => {
    const panel = document.querySelector('#dead-tired .chapter__panel');
    window.scrollTo(0, panel.getBoundingClientRect().top + window.scrollY + 200);
  });
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.__draws)).toBe(before);
  await page.evaluate(() => document.getElementById('dead-tired').scrollIntoView({ block: 'start' }));
  await expect.poll(() => page.evaluate(() => window.__draws), { timeout: 5_000 }).toBeGreaterThan(before);
});
