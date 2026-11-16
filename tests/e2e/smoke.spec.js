import { test, expect } from '@playwright/test';

test('the page loads with its title', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Oscar — Built with Claude Code');
});
