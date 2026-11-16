import { test, expect } from '@playwright/test';
import { projects } from '../../src/content/projects.js';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('every chapter world goes live', async ({ page }) => {
  await page.goto('./');
  for (const p of projects) {
    await scrollToId(page, p.id);
    await expect(page.locator(`#${p.id}`)).toHaveClass(/is-live/, { timeout: 30_000 });
  }
  // Only chapters: the hero's own world arrives in Task 12, so the hero still falls back to its poster here.
  await expect(page.locator('.chapter.is-failed')).toHaveCount(0);
});

test('a chapter whose cover fails falls back to its poster, and the others still work', async ({ page }) => {
  await page.route('**/projects/ascii-mirror/cover.webp', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await expect(page.locator('#ascii-mirror')).toHaveClass(/is-failed/, { timeout: 30_000 });
  await expect.poll(() => page.locator('#ascii-mirror .scene__poster').evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
});
