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

test('tall screens get the portrait poster and wide screens the landscape one', async ({ page }) => {
  const src = (id) => page.locator(`#${id} .scene__poster`).evaluate((img) => img.currentSrc);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./?posters');
  await expect.poll(() => src('top')).toMatch(/\/posters\/hero-portrait\.webp$/);
  await page.locator('#dead-tired').scrollIntoViewIfNeeded();
  await expect.poll(() => src('dead-tired')).toMatch(/\/posters\/dead-tired-portrait\.webp$/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => src('dead-tired')).toMatch(/\/posters\/dead-tired\.webp$/);
});
