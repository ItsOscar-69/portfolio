import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);
const dots = (page) => page.locator('#pico-light-show .lightshow__now .lightshow__strip i').evaluateAll((els) => els.map((el) => el.style.backgroundColor).join('|'));
const introDots = (page) => page.locator('#pico-light-show .lightshow__strip--intro i').evaluateAll((els) => els.map((el) => el.style.backgroundColor).join('|'));

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
  // the running line sits inside the code box's visible area
  const inBox = await page.evaluate(() => {
    const pre = document.querySelector('#pico-light-show .media--code pre').getBoundingClientRect();
    const el = document.querySelector('#pico-light-show .code-line.is-running').getBoundingClientRect();
    return el.top >= pre.top - 1 && el.bottom <= pre.bottom + 1;
  });
  expect(inBox).toBe(true);
  // the 3D strip is showing, so the intro strip is hidden
  await expect(show.locator('.lightshow__strip--intro')).toBeHidden();
});

test('the code box stays where the visitor scrolled it', async ({ page }) => {
  await page.goto('./');
  const show = page.locator('#pico-light-show');
  await scrollToId(page, 'pico-light-show');
  await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
  await show.getByRole('button', { name: 'Twin comets' }).click();
  await page.evaluate(() => document.querySelector('#pico-light-show .media--code[data-live]').scrollIntoView({ block: 'center' }));
  await expect.poll(async () => Number(await show.locator('.code-line.is-running').getAttribute('data-line')), { timeout: 5_000 }).toBeGreaterThanOrEqual(153);
  const pre = show.locator('.media--code[data-live] pre');
  await expect.poll(async () => (await pre.boundingBox()).y, { timeout: 5_000 }).toBeLessThan(400);
  const box = await pre.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -2000);
  await expect.poll(() => pre.evaluate((el) => el.scrollTop), { timeout: 3_000 }).toBe(0);
  const top = await pre.evaluate((el) => el.scrollTop);
  await page.waitForTimeout(2000);
  expect(await pre.evaluate((el) => el.scrollTop)).toBe(top);
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
    await expect(show.locator('.lightshow__strip--intro')).toBeVisible();
    const introBefore = await introDots(page);
    expect(introBefore.split('|')).toHaveLength(20);
    const before = await dots(page);
    expect(before.split('|')).toHaveLength(20);
    for (const colour of before.split('|')) expect(colour).toMatch(/^rgb\(/);
    await page.waitForTimeout(800);
    expect(await dots(page)).toBe(before);
    await expect(page.locator('html')).not.toHaveClass(/webgl/);
    await expect(show).not.toHaveClass(/is-live/);
    await show.getByRole('button', { name: 'Play' }).click();
    await expect.poll(() => dots(page), { timeout: 5_000 }).not.toBe(before);
    await expect.poll(() => introDots(page), { timeout: 5_000 }).not.toBe(introBefore);
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
  await page.waitForTimeout(1000);
  await expect(page.locator('html')).not.toHaveClass(/webgl/);
  await expect(page.locator('#pico-light-show')).not.toHaveClass(/is-live/);
  const before = await dots(page);
  await expect.poll(() => dots(page), { timeout: 5_000 }).not.toBe(before);
});
