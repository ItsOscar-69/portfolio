import { test, expect } from '@playwright/test';
import { projects } from '../../src/content/projects.js';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('every chapter world goes live', async ({ page }) => {
  await page.goto('./');
  for (const p of projects) {
    await scrollToId(page, p.id);
    await expect(page.locator(`#${p.id}`)).toHaveClass(/is-live/, { timeout: 30_000 });
  }
  // Only chapters: the hero has its own test in hero.spec.js.
  await expect(page.locator('.chapter.is-failed')).toHaveCount(0);
});
