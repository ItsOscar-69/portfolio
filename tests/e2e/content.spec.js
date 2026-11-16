import { test, expect } from '@playwright/test';
import { projects } from '../../src/content/projects.js';

const pad2 = (n) => String(n).padStart(2, '0');

test('every project in the list renders a chapter', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.hero__count')).toHaveText(`${projects.length} projects built with Claude Code, and counting`);
  await expect(page.locator('section.chapter')).toHaveCount(projects.length);
  for (const [i, p] of projects.entries()) {
    const chapter = page.locator(`#${p.id}`);
    await expect(chapter).toHaveAttribute('data-number', pad2(i + 1));
    await expect(chapter.locator('h2')).toHaveText(p.title);
    await expect(chapter.locator('.chapter__hook')).toHaveText(p.hook);
    await expect(chapter.locator('.panel__headline')).toHaveText(p.headline);
    await expect(chapter.locator('.card')).toHaveCount(3);
  }
  await expect(page.locator('#ascii-mirror .badge')).toHaveText('In progress');
  await expect(page.locator('#next-title')).toHaveText(`Project ${pad2(projects.length + 1)} is loading…`);
  await expect(page.locator('#pico-light-show .media--code code')).toContainText('def twin_comets(px):');
});

for (const width of [375, 1440]) {
  test(`no sideways scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}
