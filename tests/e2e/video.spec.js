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
  const visible = await video.evaluate((v) => { const r = v.getBoundingClientRect(); return (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height; });
  expect(visible).toBeGreaterThan(0.5);
  expect(visible).toBeLessThan(0.7);
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
  // Record where playback resumes: a loop wrap by itself would also give a small currentTime later.
  await video.evaluate((v) => v.addEventListener('playing', () => { window.__resumedAt = v.currentTime; }, { once: true }));
  await center(video);
  await expect.poll(() => page.evaluate(() => window.__resumedAt), { timeout: 20_000 }).toBeDefined();
  expect(await page.evaluate(() => window.__resumedAt)).toBeLessThan(0.5);
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

test.describe('on a sideways phone', () => {
  test.use({ viewport: { width: 812, height: 375 } });
  test('the ASCII demo, taller than the screen, plays once it fills it', async ({ page }) => {
    await page.goto('./');
    const video = page.locator('#ascii-mirror video');
    // Scroll in 1px steps, like a visitor would: the observer only reports when a threshold is crossed, so jumping
    // straight to the end would hide the problem.
    await video.evaluate(async (v) => {
      const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const r = v.getBoundingClientRect();
      const to = window.scrollY + r.top - (innerHeight - r.height) / 2; // centered
      window.scrollTo(0, to - 120);
      await frame(); await frame();
      for (let y = to - 120; y <= to; y += 1) { window.scrollTo(0, y); await frame(); }
    });
    await expect.poll(() => isPlaying(video), { timeout: 20_000 }).toBe(true);
  });
});
