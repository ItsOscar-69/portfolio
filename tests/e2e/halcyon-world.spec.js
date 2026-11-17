import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('the HALCYON chapter runs its own chrome-body world', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#halcyon-somatics')).toHaveAttribute('data-world', 'halcyon');
  await scrollToId(page, 'halcyon-somatics');
  await expect(page.locator('#halcyon-somatics')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('a missing panel screenshot only drops that panel', async ({ page }) => {
  await page.route('**/projects/halcyon-somatics/shot-terms-900.webp', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'halcyon-somatics');
  await expect(page.locator('#halcyon-somatics')).toHaveClass(/is-live/, { timeout: 30_000 });
  await expect(page.locator('#halcyon-somatics')).not.toHaveClass(/is-failed/);
});

test('if the body wireframe fails to load, the chapter falls back to its poster', async ({ page }) => {
  await page.route('**/projects/halcyon-somatics/body-wireframe.svg', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'halcyon-somatics');
  await expect(page.locator('#halcyon-somatics')).toHaveClass(/is-failed/, { timeout: 30_000 });
  await expect.poll(() => page.locator('#halcyon-somatics .scene__poster').evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
});

test('still mode renders the HALCYON world for its poster', async ({ page }) => {
  await page.goto('./?still=halcyon-somatics&p=0.85&tier=high');
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
});

test('still mode waits for slow background panels before it reports ready', async ({ page }) => {
  test.setTimeout(150_000); // the 12 s delay plus a full still render can pass the 90 s default
  let released = false;
  await page.route('**/projects/halcyon-somatics/shot-terms-900.webp', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 12_000)); // a very slow panel
    released = true;
    await route.continue();
  });
  // Don't wait for `load`: a slow image that starts before it would hold `load` back, and `goto` would hide the bug.
  await page.goto('./?still=halcyon-somatics&p=0.85&tier=high', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 80_000 });
  expect(released).toBe(true);
});
