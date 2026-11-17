import { test, expect } from '@playwright/test';
import sharp from 'sharp';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('the Pico chapter runs the light-show world', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#pico-light-show')).toHaveAttribute('data-world', 'pico');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('still mode renders the light show for its poster, and blooms it on the high tier only', async ({ page }) => {
  // Still mode hides the page's text, so the screenshot is the 3D frame alone. Measure the band the strip sits in.
  const brightness = async (tier) => {
    await page.goto(`./?still=pico-light-show&p=0.85&tier=${tier}`);
    await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
    const { width, height } = page.viewportSize();
    const band = { left: 0, top: Math.round(height * 0.2), width, height: Math.round(height * 0.45) };
    const { channels } = await sharp(await page.screenshot()).extract(band).greyscale().stats();
    return channels[0].mean;
  };
  const low = await brightness('low');
  const high = await brightness('high');
  expect(high).toBeGreaterThan(low + 2); // bloom adds light around every lit LED
});
