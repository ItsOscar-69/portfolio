import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);
const dots = (page) => page.locator('#pico-light-show .lightshow__strip i').evaluateAll((els) => els.map((el) => el.style.backgroundColor).join('|'));

test('the chips pick an effect, and the code panel follows without moving the page', async ({ page }) => {
  await page.goto('./');
  await scrollToId(page, 'pico-light-show');
  const show = page.locator('#pico-light-show');
  await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
  await expect(show.locator('.lightshow .chip')).toHaveCount(6);
  const y = await page.evaluate(() => scrollY);
  await show.getByRole('button', { name: 'Fire' }).click();
  await expect(show.getByRole('button', { name: 'Fire' })).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
  await expect(show.locator('.lightshow__name')).toHaveText('fire');
  const line = Number(await show.locator('.code-line.is-running').getAttribute('data-line'));
  expect(line).toBeGreaterThanOrEqual(195);
  expect(line).toBeLessThanOrEqual(220);
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(2);
});

test('pause stops the show and play starts it again', async ({ page }) => {
  await page.goto('./');
  await scrollToId(page, 'pico-light-show');
  const show = page.locator('#pico-light-show');
  await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
  await show.getByRole('button', { name: 'Pause' }).click();
  const paused = await dots(page);
  await page.waitForTimeout(600);
  expect(await dots(page)).toBe(paused);
  await show.getByRole('button', { name: 'Play' }).click();
  await expect.poll(() => dots(page), { timeout: 5_000 }).not.toBe(paused);
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('nothing moves until Play is pressed, then the show runs without the 3D stage', async ({ page }) => {
    await page.goto('./');
    await scrollToId(page, 'pico-light-show');
    const show = page.locator('#pico-light-show');
    await expect(show.getByRole('button', { name: 'Play' })).toBeVisible();
    const before = await dots(page);
    await page.waitForTimeout(800);
    expect(await dots(page)).toBe(before);
    await expect(page.locator('html')).not.toHaveClass(/webgl/);
    await show.getByRole('button', { name: 'Play' }).click();
    await expect.poll(() => dots(page), { timeout: 5_000 }).not.toBe(before);
    await expect(show.locator('.code-line.is-running')).toHaveCount(1);
  });
});

test('without WebGL the show still runs on the dot strip', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  await page.goto('./');
  await scrollToId(page, 'pico-light-show');
  const before = await dots(page);
  await expect.poll(() => dots(page), { timeout: 5_000 }).not.toBe(before);
});
