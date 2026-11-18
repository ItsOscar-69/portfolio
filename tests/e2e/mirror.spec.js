import { test, expect } from '@playwright/test';
import sharp from 'sharp';

// measured under SwiftShader: mean green 15.2 without the webcam, 41.9 with it (a gain of 26.8); the margin is half that
const MARGIN = 13;
const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

// A stand-in camera: a bright disc moving on black, from a canvas stream. It records every getUserMedia request.
// white: a plain white frame. holdCamera: getUserMedia waits for window.__camera.releaseCamera(). holdPlay: video.play() waits for releasePlay().
function fakeCamera({ fail, holdCamera, holdPlay, white } = {}) {
  window.__camera = { requests: [], streams: [] };
  const gate = (name) => new Promise((resolve) => { window.__camera[name] = resolve; });
  const cameraGate = holdCamera ? gate('releaseCamera') : null;
  const playGate = holdPlay ? gate('releasePlay') : null;
  if (holdPlay) {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = async function () {
      const started = play.call(this).catch(() => {}); // really start playing, but report it late
      await playGate;
      return started;
    };
  }
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const g = canvas.getContext('2d');
  let t = 0;
  setInterval(() => {
    t += 1;
    g.fillStyle = white ? '#fff' : '#000';
    g.fillRect(0, 0, 320, 240);
    if (white) return;
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(160 + 70 * Math.sin(t / 6), 120, 60, 0, Math.PI * 2);
    g.fill();
  }, 33);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    window.__camera.requests.push(constraints);
    if (fail) throw new DOMException('Permission denied', fail);
    if (cameraGate) await cameraGate;
    const stream = canvas.captureStream(30);
    window.__camera.streams.push(stream);
    return stream;
  };
}
const hideTab = (page) => page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
});
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
  await expect(chapter.locator('.mirror__on')).toBeVisible();
  const [constraints] = await page.evaluate(() => window.__camera.requests);
  expect(constraints.audio).toBe(false);
  expect(constraints.video).toBeTruthy();
  await expect(chapter.locator('.mirror__ascii')).toBeHidden(); // the 3D world draws the webcam itself
  expect(await tracks(page)).toEqual(['live']);
  await chapter.getByRole('button', { name: 'Stop the camera' }).click();
  await expect(chapter.locator('.mirror__on')).toBeHidden();
  expect(await tracks(page)).toEqual(['ended']);
  await expect(chapter.getByRole('button', { name: 'Try the mirror' })).toBeVisible();
});

test('scrolling away turns the camera off', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await page.locator('#ascii-mirror').getByRole('button', { name: 'Try the mirror' }).click();
  await expect(page.locator('#ascii-mirror').locator('.mirror__on')).toBeVisible();
  await scrollToId(page, 'dead-tired');
  await expect.poll(() => tracks(page), { timeout: 5_000 }).toEqual(['ended']);
});

test('scrolling on into the chapter panel turns the camera off', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.locator('.mirror__on')).toBeVisible();
  await page.evaluate(() => document.querySelector('#ascii-mirror .chapter__panel').scrollIntoView({ block: 'start' }));
  await expect.poll(() => tracks(page), { timeout: 5_000 }).toEqual(['ended']);
  await expect(chapter.locator('.mirror__on')).toHaveAttribute('hidden', '');
  await expect(chapter.locator('.mirror__status')).toHaveText('The camera stopped when you scrolled away.');
});

test('a camera that ends by itself turns the mirror off', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.locator('.mirror__on')).toBeVisible();
  // track.stop() does not fire "ended", so fire it as the browser does when permission is revoked or the camera is unplugged
  await page.evaluate(() => window.__camera.streams[0].getVideoTracks()[0].dispatchEvent(new Event('ended')));
  await expect(chapter.locator('.mirror__on')).toBeHidden();
  await expect(chapter.locator('.mirror__status')).toHaveText('The camera was turned off.');
  expect(await tracks(page)).toEqual(['ended']);
});

test('keyboard: Start moves focus to Stop, and Stop moves it back', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  const start = chapter.getByRole('button', { name: 'Try the mirror' });
  await start.focus();
  await page.keyboard.press('Enter');
  const stopButton = chapter.getByRole('button', { name: 'Stop the camera' });
  await expect(stopButton).toBeFocused();
  await expect(chapter.locator('.mirror__status')).toHaveText('Camera on. The picture stays in your browser: nothing is sent or saved.');
  await page.keyboard.press('Enter');
  await expect(start).toBeFocused();
  expect(await tracks(page)).toEqual(['ended']);
});

test('hiding the tab turns the camera off',async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.locator('.mirror__on')).toBeVisible();
  await hideTab(page);
  await expect.poll(() => tracks(page), { timeout: 5_000 }).toEqual(['ended']);
  await expect(chapter.locator('.mirror__on')).toHaveAttribute('hidden', '');
  await expect(chapter.locator('.mirror__status')).toHaveText('The camera stopped when you left the tab.');
});

test('leaving the page turns the camera off', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.locator('.mirror__on')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(() => tracks(page), { timeout: 5_000 }).toEqual(['ended']);
});

test('a camera granted after you scrolled away is turned off at once', async ({ page }) => {
  await page.addInitScript(fakeCamera, { holdCamera: true });
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await page.waitForFunction(() => window.__camera.requests.length === 1);
  await scrollToId(page, 'dead-tired');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__camera.releaseCamera());
  await expect.poll(() => tracks(page), { timeout: 5_000 }).toEqual(['ended']);
  await expect(chapter.locator('.mirror__on')).toHaveAttribute('hidden', '');
});

test('Camera on never shows if the camera stopped while the video was starting', async ({ page }) => {
  await page.addInitScript(fakeCamera, { holdPlay: true });
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await page.waitForFunction(() => window.__camera.streams.length === 1);
  await hideTab(page);
  await page.evaluate(() => window.__camera.releasePlay());
  await page.waitForTimeout(500);
  await expect(chapter.locator('.mirror__on')).toHaveAttribute('hidden', '');
  expect(await tracks(page)).toEqual(['ended']);
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
  await expect(page.locator('#ascii-mirror').locator('.mirror__on')).toBeVisible();
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
  await expect(chapter.locator('.mirror__on')).toBeHidden();
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
    // the text sits under the chapter's scrim, so the words stay readable
    const { opacity, zIndex, scrimZ } = await chapter.locator('.scene__frame').evaluate((frame) => {
      const pre = frame.querySelector('.mirror__ascii');
      return {
        opacity: Number(getComputedStyle(pre).opacity),
        zIndex: Number(getComputedStyle(pre).zIndex),
        scrimZ: Number(getComputedStyle(frame, '::before').zIndex),
      };
    });
    expect(opacity).toBeLessThan(1);
    expect(zIndex).toBeLessThan(scrimZ);
  });
});

test('the 3D world draws the webcam', async ({ page }) => {
  await page.addInitScript(fakeCamera, { white: true });
  await page.goto('./?tier=high');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await expect(chapter).toHaveClass(/is-live/, { timeout: 60_000 });
  const frame = chapter.locator('.scene__frame');
  const meanGreen = async () => (await sharp(await frame.screenshot()).stats()).channels[1].mean;
  await page.waitForTimeout(500);
  const before = await meanGreen();
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.locator('.mirror__on')).toBeVisible();
  await page.waitForTimeout(1_000);
  const during = await meanGreen();
  expect(during - before).toBeGreaterThan(MARGIN);
});
