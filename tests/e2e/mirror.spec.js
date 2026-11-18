import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

// A stand-in camera: a bright disc moving on black, from a canvas stream. It records every getUserMedia request.
function fakeCamera({ fail } = {}) {
  window.__camera = { requests: [], streams: [] };
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const g = canvas.getContext('2d');
  let t = 0;
  setInterval(() => {
    t += 1;
    g.fillStyle = '#000';
    g.fillRect(0, 0, 320, 240);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(160 + 70 * Math.sin(t / 6), 120, 60, 0, Math.PI * 2);
    g.fill();
  }, 33);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    window.__camera.requests.push(constraints);
    if (fail) throw new DOMException('Permission denied', fail);
    const stream = canvas.captureStream(30);
    window.__camera.streams.push(stream);
    return stream;
  };
}
const tracks = (page) => page.evaluate(() => window.__camera.streams.map((s) => s.getVideoTracks()[0].readyState));

test('the camera starts only on a click, shows Camera on, and Stop turns it off', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await expect(chapter).toHaveClass(/is-live/, { timeout: 30_000 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__camera.requests.length)).toBe(0);
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.getByText('Camera on')).toBeVisible();
  const [constraints] = await page.evaluate(() => window.__camera.requests);
  expect(constraints.audio).toBe(false);
  expect(constraints.video).toBeTruthy();
  await expect(chapter.locator('.mirror__ascii')).toBeHidden(); // the 3D world draws the webcam itself
  expect(await tracks(page)).toEqual(['live']);
  await chapter.getByRole('button', { name: 'Stop' }).click();
  await expect(chapter.getByText('Camera on')).toBeHidden();
  expect(await tracks(page)).toEqual(['ended']);
  await expect(chapter.getByRole('button', { name: 'Try the mirror' })).toBeVisible();
});

test('scrolling away turns the camera off', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await page.locator('#ascii-mirror').getByRole('button', { name: 'Try the mirror' }).click();
  await expect(page.locator('#ascii-mirror').getByText('Camera on')).toBeVisible();
  await scrollToId(page, 'dead-tired');
  await expect.poll(() => tracks(page), { timeout: 5_000 }).toEqual(['ended']);
});

test('no frame leaves the page while the mirror runs', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await expect(page.locator('#ascii-mirror')).toHaveClass(/is-live/, { timeout: 30_000 });
  const origin = new URL(page.url()).origin;
  const sent = [];
  page.on('request', (r) => { if (r.method() !== 'GET' || !r.url().startsWith(origin)) sent.push(`${r.method()} ${r.url()}`); });
  page.on('websocket', (ws) => sent.push(`websocket ${ws.url()}`));
  await page.locator('#ascii-mirror').getByRole('button', { name: 'Try the mirror' }).click();
  await expect(page.locator('#ascii-mirror').getByText('Camera on')).toBeVisible();
  await page.waitForTimeout(2_000);
  expect(sent).toEqual([]);
});

test('a blocked camera shows a clear message, and the model stays on screen', async ({ page }) => {
  await page.addInitScript(fakeCamera, { fail: 'NotAllowedError' });
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await expect(chapter).toHaveClass(/is-live/, { timeout: 30_000 });
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.locator('.mirror__status')).toContainText('blocked');
  await expect(chapter.getByText('Camera on')).toBeHidden();
  await expect(chapter).toHaveClass(/is-live/);
});

test('a browser with no camera support says so', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }));
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await page.locator('#ascii-mirror').getByRole('button', { name: 'Try the mirror' }).click();
  await expect(page.locator('#ascii-mirror .mirror__status')).toContainText('isn’t available');
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the mirror still works, drawn as text over the poster, once clicked', async ({ page }) => {
    await page.addInitScript(fakeCamera, {});
    await page.goto('./');
    await scrollToId(page, 'ascii-mirror');
    await page.waitForTimeout(1_000);
    await expect(page.locator('html')).not.toHaveClass(/webgl/);
    const chapter = page.locator('#ascii-mirror');
    await expect(chapter.locator('.mirror__ascii')).toBeHidden();
    await chapter.getByRole('button', { name: 'Try the mirror' }).click();
    const text = chapter.locator('.mirror__ascii');
    await expect(text).toBeVisible();
    await expect.poll(() => text.textContent(), { timeout: 5_000 }).toMatch(/@/);
    const first = await text.textContent();
    await expect.poll(() => text.textContent(), { timeout: 5_000 }).not.toBe(first);
  });
});
