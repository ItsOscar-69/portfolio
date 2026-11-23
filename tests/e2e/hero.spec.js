import { test, expect } from '@playwright/test';

test('the hero world goes live on load', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#top')).toHaveClass(/is-live/, { timeout: 30_000 });
  await expect(page.locator('#top')).not.toHaveClass(/is-failed/);
});

for (const [width, height] of [[1440, 900], [375, 812]]) {
  test(`at ${width}×${height} the hero count sits at the frame's bottom-left content edge`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./?posters');
    const { countLeft, contentLeft, sourceRects } = await page.evaluate(() => {
      const frame = document.querySelector('#top .scene__frame');
      const count = document.querySelector('#top .hero__count');
      const pad = parseFloat(getComputedStyle(frame).paddingLeft);
      return {
        countLeft: count.getBoundingClientRect().left,
        contentLeft: frame.getBoundingClientRect().left + pad,
        sourceRects: document.querySelector('#top picture source').getClientRects().length,
      };
    });
    expect(sourceRects).toBe(0);
    expect(Math.abs(countLeft - contentLeft)).toBeLessThan(1);
  });
}
