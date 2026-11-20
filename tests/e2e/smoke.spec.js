import { test, expect } from '@playwright/test';

test('the page loads with its title', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Oscar — Built with Claude Code');
});

test('?fps shows a frame-rate readout with the device tier, and is off by default', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(1500);
  await expect(page.locator('.fps')).toHaveCount(0);
  await page.goto('./?fps');
  await expect(page.locator('.fps')).toHaveText(/^\d+ fps · (high|mid|low)$/, { timeout: 15_000 });
});

test('the hero text paints within 2 s on a throttled phone (spec §8.1)', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(baseURL, { waitUntil: 'load', timeout: 60_000 }); // a bare browser context doesn't get baseURL
  const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime);
  expect(fcp).toBeGreaterThan(0);
  expect(fcp).toBeLessThan(2000);
  await context.close();
});
