import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('the ASCII Mirror chapter runs its ASCII world', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#ascii-mirror')).toHaveAttribute('data-world', 'ascii');
  await scrollToId(page, 'ascii-mirror');
  await expect(page.locator('#ascii-mirror')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('if the Pi model fails to load, the chapter falls back to its poster and the others carry on', async ({ page }) => {
  await page.route('**/projects/ascii-mirror/pi-assembly.glb', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await expect(page.locator('#ascii-mirror')).toHaveClass(/is-failed/, { timeout: 30_000 });
  await expect.poll(() => page.locator('#ascii-mirror .scene__poster').evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
});

test('still mode renders the ASCII world for its poster', async ({ page }) => {
  await page.goto('./?still=ascii-mirror&p=0.85&tier=high');
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
  await expect(page.locator('#ascii-mirror')).toHaveAttribute('data-world', 'ascii');
});
