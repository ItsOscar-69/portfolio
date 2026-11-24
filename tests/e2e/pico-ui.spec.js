import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);
const dots = (page) => page.locator('#pico-light-show .lightshow__now .lightshow__strip i').evaluateAll((els) => els.map((el) => el.style.backgroundColor).join('|'));
const introDots = (page) => page.locator('#pico-light-show .lightshow__strip--intro i').evaluateAll((els) => els.map((el) => el.style.backgroundColor).join('|'));

// Records every scrollTo() the code box gets, with the behavior it asked for.
const recordCodeScrolls = (page) => page.addInitScript(() => {
  window.__codeScrolls = [];
  const original = Element.prototype.scrollTo;
  Element.prototype.scrollTo = function (...args) {
    if (this.matches && this.matches('.media--code pre')) window.__codeScrolls.push(args[0] && args[0].behavior);
    return original.apply(this, args);
  };
});
const runningInView = (page) => page.evaluate(() => {
  const pre = document.querySelector('#pico-light-show .media--code pre');
  const el = pre.querySelector('.code-line.is-running');
  return !!el && el.offsetTop >= pre.scrollTop - 1 && el.offsetTop + el.offsetHeight <= pre.scrollTop + pre.clientHeight + 1;
});
// Scrolls the page in 1px steps, so the visibility observer sees every ratio on the way.
const stepScroll = (page, selector, targetTop) => page.evaluate(async ([sel, wanted]) => {
  const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  const r = document.querySelector(sel).getBoundingClientRect();
  const to = window.scrollY + r.top - wanted; // page scroll that puts the box's top at `wanted`
  const from = Math.max(0, to - 400);
  window.scrollTo(0, from);
  await frame(); await frame();
  for (let y = from; y <= to; y += 1) { window.scrollTo(0, y); await frame(); }
}, [selector, targetTop]);

test('the chips pick an effect, and the code panel follows without moving the page', async ({ page }) => {
  await page.goto('./');
  await scrollToId(page, 'pico-light-show');
  const show = page.locator('#pico-light-show');
  await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
  await expect(show.locator('.lightshow .chip')).toHaveCount(6);
  await show.getByRole('button', { name: 'Fire' }).click();
  await page.mouse.move(1, 1); // hovering the box counts as reading
  await page.evaluate(() => document.querySelector('#pico-light-show .media--code[data-live]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  const y = await page.evaluate(() => scrollY);
  await expect(show.getByRole('button', { name: 'Fire' })).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
  await expect(show.locator('.lightshow__name')).toHaveText('fire');
  const line = Number(await show.locator('.code-line.is-running').getAttribute('data-line'));
  expect(line).toBeGreaterThanOrEqual(195);
  expect(line).toBeLessThanOrEqual(220);
  // the running line sits inside the code box's visible area (the box glides there, so poll)
  await expect.poll(() => runningInView(page), { timeout: 5_000 }).toBe(true);
  // following the show never scrolls the page
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(2);
  // the 3D strip is showing, so the intro strip is hidden
  await expect(show.locator('.lightshow__strip--intro')).toBeHidden();
});

test('the code box holds still while it slides in, then glides to the running line once fully on screen', async ({ page }) => {
  await recordCodeScrolls(page);
  await page.goto('./');
  const show = page.locator('#pico-light-show');
  const pre = show.locator('.media--code[data-live] pre');
  await scrollToId(page, 'pico-light-show');
  await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
  await show.getByRole('button', { name: 'Fire' }).click();
  await page.mouse.move(1, 1);
  // only the top 40% of the box shows, at the bottom of the screen
  await pre.evaluate(async (el) => {
    const r = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top - (innerHeight - 0.4 * r.height));
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  });
  const ratio = await pre.evaluate((el) => { const r = el.getBoundingClientRect(); return (innerHeight - r.top) / r.height; });
  expect(ratio).toBeLessThan(0.5);
  // the running line is far down the file; put the box back at the top so the glide has to move it
  await pre.evaluate((el) => { el.scrollTop = 0; });
  await page.mouse.move(1, 1); // hovering the box counts as reading
  expect(await runningInView(page)).toBe(false);
  const calls = await page.evaluate(() => window.__codeScrolls.length);
  await page.waitForTimeout(3000); // the show keeps playing, and the running line keeps changing
  expect(await pre.evaluate((el) => el.scrollTop)).toBe(0);
  expect(await page.evaluate(() => window.__codeScrolls.length)).toBe(calls);
  await pre.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect.poll(() => runningInView(page), { timeout: 3_000 }).toBe(true);
  expect(await pre.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const after = await page.evaluate((n) => window.__codeScrolls.slice(n), calls);
  expect(after.length).toBeGreaterThan(0);
  expect(after).toContain('smooth');
});

test.describe('on a sideways phone', () => {
  test.use({ viewport: { width: 812, height: 375 } });
  test('the box still follows once it fills the screen', async ({ page }) => {
    await page.goto('./');
    const show = page.locator('#pico-light-show');
    await scrollToId(page, 'pico-light-show');
    await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
    await show.getByRole('button', { name: 'Fire' }).click();
    await page.mouse.move(1, 1); // keep the pointer off the box, or it counts as reading
    await page.evaluate(() => window.scrollTo(0, 0));
    // scroll the box up in 1px steps until its top reaches the top of the screen
    await stepScroll(page, '#pico-light-show .media--code[data-live] pre', 0);
    await expect.poll(() => runningInView(page), { timeout: 5_000 }).toBe(true);
  });
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

test('scrolling the box mid-glide wins over the glide', async ({ page }) => {
  await page.goto('./');
  const show = page.locator('#pico-light-show');
  await scrollToId(page, 'pico-light-show');
  await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
  await show.getByRole('button', { name: 'Twin comets' }).click();
  await page.evaluate(() => document.querySelector('#pico-light-show .media--code[data-live]').scrollIntoView({ block: 'center' }));
  const pre = show.locator('.media--code[data-live] pre');
  // a glide is definitely in flight: the box has started moving but has not reached the running line
  await expect.poll(() => pre.evaluate((el) => el.scrollTop), { timeout: 5_000 }).toBeGreaterThan(0);
  const box = await pre.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -2000);
  await expect.poll(() => pre.evaluate((el) => el.scrollTop), { timeout: 3_000 }).toBe(0);
  await page.waitForTimeout(2000);
  expect(await pre.evaluate((el) => el.scrollTop)).toBe(0);
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

  test('the code box jumps to the running line without a glide', async ({ page }) => {
    await recordCodeScrolls(page);
    await page.goto('./');
    const show = page.locator('#pico-light-show');
    await scrollToId(page, 'pico-light-show');
    await show.getByRole('button', { name: 'Play' }).click();
    await show.getByRole('button', { name: 'Fire' }).click();
    await page.mouse.move(1, 1);
    await page.evaluate(() => document.querySelector('#pico-light-show .media--code[data-live]').scrollIntoView({ block: 'center' }));
    await expect.poll(() => runningInView(page), { timeout: 1_000 }).toBe(true);
    const calls = await page.evaluate(() => window.__codeScrolls);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1]).toBe('auto');
    expect(calls).not.toContain('smooth');
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
