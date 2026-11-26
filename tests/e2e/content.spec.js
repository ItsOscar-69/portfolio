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

test('the HALCYON write-up has no big link tile, and its live-page link is a pill button', async ({ page }) => {
  await page.goto('./?posters');
  const panel = page.locator('#halcyon-somatics .chapter__panel');
  await expect(panel.locator('.media--link')).toHaveCount(0);
  const link = panel.locator('.panel__links a', { hasText: 'Visit the live page' });
  await expect(link).toHaveAttribute('href', '/halcyon/');
  const style = await link.evaluate((a) => { const s = getComputedStyle(a); return { radius: parseFloat(s.borderTopLeftRadius), border: s.borderTopStyle, underline: s.textDecorationLine }; });
  expect(style.radius).toBeGreaterThan(100);
  expect(style.border).toBe('solid');
  expect(style.underline).toBe('none');
});

test('small labels are mono in their own casing, never forced to wide-spaced capitals', async ({ page }) => {
  await page.goto('./?posters');
  for (const sel of ['.chapter__meta', '.scene__frame .badge', '.card h4', '.mirror__on']) {
    const label = await page.locator(sel).first().evaluate((el) => { const s = getComputedStyle(el); return { transform: s.textTransform, family: s.fontFamily, size: parseFloat(s.fontSize), tracking: parseFloat(s.letterSpacing) || 0 }; });
    expect([sel, label.transform]).toEqual([sel, 'none']);
    expect(label.family).toMatch(/JetBrains Mono/);
    expect(label.size).toBeLessThanOrEqual(12);
    expect(label.tracking).toBeLessThanOrEqual(0.05 * label.size); // at most slightly open
  }
});
