import { test, expect } from '@playwright/test';

const VIDEO = '#halcyon-somatics video';

test('the HALCYON recording plays muted on a loop while on screen, and pauses when scrolled away', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await expect(video).toHaveAttribute('loop', '');
  expect(await video.evaluate((v) => v.muted)).toBe(true);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0), { timeout: 20_000 }).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => video.evaluate((v) => v.paused), { timeout: 10_000 }).toBe(true);
});

test('a video the visitor paused stays paused when they scroll back', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v) => !v.paused), { timeout: 20_000 }).toBe(true);
  await video.evaluate((v) => v.pause()); // the visitor presses pause
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(await video.evaluate((v) => v.paused)).toBe(true);
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the recording never starts by itself, but its controls are there', async ({ page }) => {
    await page.goto('./');
    const video = page.locator(VIDEO);
    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    expect(await video.evaluate((v) => v.paused)).toBe(true);
    await expect(video).toHaveAttribute('controls', '');
  });
});
