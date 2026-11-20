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

async function wheelOverViewer(page) {
  await page.goto('./');
  const figure = await viewer(page);
  await expect(figure).toHaveClass(/is-ready/, { timeout: 30_000 });
  const box = await figure.locator('.model__canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5_000 }).toBeGreaterThan(before + 100);
}

test('a wheel over the viewer scrolls the page instead of zooming', async ({ page }) => {
  await wheelOverViewer(page);
});

// Lenis's virtual scroll ignores defaultPrevented, so the test above cannot fail. With reduced motion the page
// scrolls natively, and a canvas that swallowed the wheel would show.
test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('a wheel over the viewer scrolls the page natively instead of zooming', async ({ page }) => {
    await wheelOverViewer(page);
  });
});

const poster = (figure) => figure.locator('.model__stage img');
const waitForWarning = (page) => page.waitForEvent('console', {
  predicate: (m) => m.text().includes('[model viewer]') && m.text().includes('keeping the poster'),
  timeout: 30_000,
});

test('without WebGL the poster and the part list stay', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  const warned = waitForWarning(page);
  await page.goto('./');
  const figure = await viewer(page);
  await warned;
  await expect(figure).not.toHaveClass(/is-ready/);
  await expect.poll(() => poster(figure).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await expect(figure.getByRole('list', { name: 'Parts of the build' }).getByRole('button')).toHaveCount(7);
});

test('if the model fails to load, the poster and the part list stay', async ({ page }) => {
  await page.route('**/projects/ascii-mirror/pi-assembly.glb', (route) => route.abort());
  const warned = waitForWarning(page);
  await page.goto('./');
  const figure = await viewer(page);
  await warned;
  await expect(figure).not.toHaveClass(/is-ready/);
  await expect.poll(() => poster(figure).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await expect(figure.getByRole('list', { name: 'Parts of the build' }).getByRole('button')).toHaveCount(7);
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true });

  test('a tap pins a part, and a second tap unpins it', async ({ page }) => {
    await page.goto('./');
    const figure = await viewer(page);
    const mount = figure.getByRole('button', { name: 'Camera mount (printed)' });
    await expect(mount).toHaveAttribute('aria-pressed', 'false');
    await mount.tap();
    await expect(mount).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => highlighted(figure)).toBe('mount');
    await page.touchscreen.tap(5, 300); // tap somewhere else on the page
    await expect.poll(() => highlighted(figure)).toBe('mount');
    await mount.tap();
    await expect(mount).toHaveAttribute('aria-pressed', 'false');
    await page.touchscreen.tap(5, 300);
    await expect.poll(() => highlighted(figure)).toBeNull();
  });
});

test('if the viewer loses its WebGL context, the poster comes back', async ({ page }) => {
  const warned = page.waitForEvent('console', { predicate: (m) => m.text().includes('[model viewer] WebGL context lost'), timeout: 30_000 });
  await page.goto('./');
  const figure = await viewer(page);
  await expect(figure).toHaveClass(/is-ready/, { timeout: 30_000 });
  await figure.locator('.model__canvas').evaluate((c) => (c.getContext('webgl2') || c.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext());
  await warned;
  await expect(figure).not.toHaveClass(/is-ready/);
  await expect.poll(() => figure.locator('.model__stage img').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});
