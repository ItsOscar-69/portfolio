import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('the DEAD TIRED chapter runs the exploded-print world', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#dead-tired')).toHaveAttribute('data-world', 'layers');
  await scrollToId(page, 'dead-tired');
  await expect(page.locator('#dead-tired')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('a missing layer makes the chapter fall back to its poster, not a stack with a hole', async ({ page }) => {
  await page.route('**/projects/dead-tired/layers/06-skeleton.webp', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'dead-tired');
  await expect(page.locator('#dead-tired')).toHaveClass(/is-failed/, { timeout: 30_000 });
  await expect.poll(() => page.locator('#dead-tired .scene__poster').evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
});

test('still mode renders the exploded-print world for its poster', async ({ page }) => {
  await page.goto('./?still=dead-tired&p=0.85&tier=high');
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
});
