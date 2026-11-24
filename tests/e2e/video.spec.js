import { test, expect } from '@playwright/test';

test.skip(process.env.PW_CHANNEL === 'chromium', "needs H.264 playback, which Playwright's own Chromium doesn't ship");

const VIDEO = '#halcyon-somatics video';
const TOGGLE = '#halcyon-somatics .media--video .media__toggle';

// Scrolls a video so that a given fraction of it is visible at the bottom of the screen.
const showFraction = (page, sel, f) => page.evaluate(([s, frac]) => {
  const v = document.querySelector(s); const r = v.getBoundingClientRect();
  window.scrollTo(0, window.scrollY + r.top - (innerHeight - r.height * frac));
}, [sel, f]);
const center = (video) => video.evaluate((v) => v.scrollIntoView({ block: 'center' }));
const isPlaying = (video) => video.evaluate((v) => !v.paused);

test('no browser player: the video has no controls, and a Pause button sits on it', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await expect(video).not.toHaveAttribute('controls');
  await expect(video).toHaveAttribute('loop', '');
  expect(await video.evaluate((v) => v.muted)).toBe(true);
  await center(video);
  await expect.poll(() => isPlaying(video), { timeout: 20_000 }).toBe(true);
  const toggle = page.locator(TOGGLE);
  await expect(toggle).toHaveText('Pause');
  await expect(toggle).toHaveAttribute('aria-label', 'Pause the video');
});

test('it waits until the video is fully on screen, then plays from the start', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await showFraction(page, VIDEO, 0.6);
  await page.waitForTimeout(1500);
  expect(await video.evaluate((v) => [v.paused, v.currentTime])).toEqual([true, 0]);
  await center(video);
  await expect.poll(() => isPlaying(video), { timeout: 20_000 }).toBe(true);
});

test('scrolling away and back starts it again from the beginning', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await center(video);
  await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime > 1.5), { timeout: 30_000 }).toBe(true);
  await page.evaluate(() => document.querySelector('#dead-tired').scrollIntoView());
  await expect.poll(() => video.evaluate((v) => v.paused), { timeout: 10_000 }).toBe(true);
  await center(video);
  await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime < 1), { timeout: 20_000 }).toBe(true);
});

test('a video the visitor paused stays paused when they scroll back', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await center(video);
  await expect.poll(() => isPlaying(video), { timeout: 20_000 }).toBe(true);
  const toggle = page.locator(TOGGLE);
  await toggle.click(); // the visitor presses Pause
  await expect(toggle).toHaveText('Play');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await center(video);
  await page.waitForTimeout(1500);
  expect(await video.evaluate((v) => v.paused)).toBe(true);
  await expect(toggle).toHaveText('Play');
});

test('keyboard: the toggle pauses and plays', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await center(video);
  await expect.poll(() => isPlaying(video), { timeout: 20_000 }).toBe(true);
  await page.locator(TOGGLE).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(() => isPlaying(video)).toBe(true);
  await expect(page.locator(TOGGLE)).toHaveText('Pause');
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the recording never starts by itself, the toggle reads Play, and clicking it starts playback', async ({ page }) => {
    await page.goto('./');
    const video = page.locator(VIDEO);
    await center(video);
    await page.waitForTimeout(2000);
    expect(await video.evaluate((v) => v.paused)).toBe(true);
    await expect(video).not.toHaveAttribute('controls');
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toHaveText('Play');
    await expect(toggle).toHaveAttribute('aria-label', 'Play the video');
    await toggle.click();
    await expect.poll(() => isPlaying(video), { timeout: 20_000 }).toBe(true);
    await expect(toggle).toHaveText('Pause');
  });
});

test('the ASCII demo recording has the same player', async ({ page }) => {
  await page.goto('./');
  const video = page.locator('#ascii-mirror video');
  await expect(video).not.toHaveAttribute('controls');
  await expect(video).toHaveAttribute('loop', '');
  expect(await video.evaluate((v) => v.muted)).toBe(true);
  await expect(page.locator('#ascii-mirror .media__toggle')).toHaveCount(1);
  await center(video);
  await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0), { timeout: 20_000 }).toBe(true);
  expect(await video.evaluate((v) => [v.videoWidth, v.videoHeight])).toEqual([1280, 720]);
});
