import { test, expect } from '@playwright/test';

test('the hero world goes live on load', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#top')).toHaveClass(/is-live/, { timeout: 30_000 });
  await expect(page.locator('#top')).not.toHaveClass(/is-failed/);
});
