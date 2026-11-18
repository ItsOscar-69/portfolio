import { test, expect } from '@playwright/test';

const viewer = async (page) => {
  const figure = page.locator('#ascii-mirror .media--model');
  await figure.scrollIntoViewIfNeeded();
  return figure;
};
const highlighted = (figure) => figure.getAttribute('data-highlight');

test('the viewer loads near the screen, lists the 7 parts, and highlights the one you point at', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  const figure = await viewer(page);
  await expect(figure).toHaveClass(/is-ready/, { timeout: 30_000 });
  await expect(figure.locator('.model__canvas')).toBeVisible();
  const parts = figure.getByRole('list', { name: 'Parts of the build' }).getByRole('button');
  await expect(parts).toHaveCount(7);
  await parts.filter({ hasText: 'Camera mount (printed)' }).hover();
  await expect.poll(() => highlighted(figure)).toBe('mount');
  await page.mouse.move(5, 5);
  await expect.poll(() => highlighted(figure)).toBeNull();
  expect(errors).toEqual([]);
});

test('focusing a part in the list highlights it, for keyboard visitors', async ({ page }) => {
  await page.goto('./');
  const figure = await viewer(page);
  const pi = figure.getByRole('button', { name: 'Raspberry Pi 5' });
  await pi.focus();
  await expect.poll(() => highlighted(figure)).toBe('pi5');
  await pi.blur();
  await expect.poll(() => highlighted(figure)).toBeNull();
});

test('a wheel over the viewer scrolls the page instead of zooming', async ({ page }) => {
  await page.goto('./');
  const figure = await viewer(page);
  await expect(figure).toHaveClass(/is-ready/, { timeout: 30_000 });
  const box = await figure.locator('.model__canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5_000 }).toBeGreaterThan(before + 100);
});

test('without WebGL the poster and the part list stay', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  await page.goto('./');
  const figure = await viewer(page);
  await page.waitForTimeout(1_500);
  await expect(figure).not.toHaveClass(/is-ready/);
  await expect(figure.locator('.model__stage img')).toBeVisible();
  await expect(figure.getByRole('list', { name: 'Parts of the build' }).getByRole('button')).toHaveCount(7);
});

test('if the model fails to load, the poster and the part list stay', async ({ page }) => {
  await page.route('**/projects/ascii-mirror/pi-assembly.glb', (route) => route.abort());
  await page.goto('./');
  const figure = await viewer(page);
  await page.waitForTimeout(1_500);
  await expect(figure).not.toHaveClass(/is-ready/);
  await expect(figure.locator('.model__stage img')).toBeVisible();
  await expect(figure.getByRole('list', { name: 'Parts of the build' }).getByRole('button')).toHaveCount(7);
});
