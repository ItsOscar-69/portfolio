import { test, expect } from '@playwright/test';

const LOCAL = new Set(['localhost', '127.0.0.1']);

test('the HALCYON copy loads its own fonts with no third-party requests', async ({ page }) => {
  const outside = [];
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.protocol.startsWith('http') && !LOCAL.has(u.hostname)) outside.push(req.url());
  });
  await page.goto('halcyon/');
  await expect(page.locator('#sec-01-title')).toHaveAttribute('aria-label', 'Perfection, installed.');
  const loaded = await page.evaluate(async () => (await document.fonts.load('400 16px "IBM Plex Mono"')).length);
  expect(loaded).toBeGreaterThan(0);
  expect(outside).toEqual([]);
});

test('the HALCYON form keeps typed text out of the URL', async ({ page }) => {
  await page.goto('halcyon/');
  await expect(page.locator('.consult__form [name]')).toHaveCount(0);
  expect(await page.locator('.consult__form').getAttribute('action')).toBeNull();
});
