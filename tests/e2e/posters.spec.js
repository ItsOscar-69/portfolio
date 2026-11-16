import { test, expect } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('with reduced motion every scene shows its poster', async ({ page }) => {
  await page.goto('./');
  const ids = await page.locator('.scene').evaluateAll((els) => els.map((el) => el.id));
  for (const id of ids) {
    await page.evaluate((el) => document.getElementById(el).scrollIntoView(), id);
    const poster = page.locator(`#${id} .scene__poster`);
    await expect.poll(() => poster.evaluate((img) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
    expect(await poster.evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  }
});
