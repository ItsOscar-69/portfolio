import { test, expect } from '@playwright/test';
import { projects } from '../../src/content/projects.js';

const pad2 = (n) => String(n).padStart(2, '0');
const label = (i) => `${pad2(i + 1)} · ${projects[i].shortTitle || projects[i].title}`;
const topOf = (page, id) => page.evaluate((el) => Math.abs(Math.round(document.getElementById(el).getBoundingClientRect().top)), id);
const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('the pill is hidden over the hero and names the chapter you are in', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.pill')).toBeHidden();
  for (const [i, p] of projects.entries()) {
    await scrollToId(page, p.id);
    await expect(page.locator('.pill__label')).toHaveText(label(i));
  }
  await scrollToId(page, 'next');
  await expect(page.locator('.pill__label')).toHaveText(`${pad2(projects.length + 1)} · Coming soon`);
});

test('the menu jumps to every chapter, including from the hero and to the current chapter', async ({ page }) => {
  await page.goto('./');
  for (const p of [...projects, projects[projects.length - 1]]) {
    await page.locator('.topbar__projects').click();
    await expect(page.locator('#chapter-menu')).toBeVisible();
    await page.locator(`#chapter-menu a[data-target="${p.id}"]`).click();
    await expect(page.locator('#chapter-menu')).toBeHidden();
    await expect.poll(() => topOf(page, p.id)).toBeLessThanOrEqual(1);
  }
});

test('the menu works from the keyboard', async ({ page }) => {
  await page.goto('./');
  const button = page.locator('.topbar__projects');
  await button.focus();
  await page.keyboard.press('Enter');
  const links = page.locator('#chapter-menu a.menu__link');
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(links.nth(1)).toBeFocused();
  for (let i = 0; i < projects.length + 2; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.getElementById('chapter-menu').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#chapter-menu')).toBeHidden();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => topOf(page, projects[1].id)).toBeLessThanOrEqual(1);
  await expect(page.locator(`#${projects[1].id}-title`)).toBeFocused();
});

test('a deep link lands on its chapter and the pill names it', async ({ page }) => {
  const last = projects.length - 1;
  await page.goto(`./#${projects[last].id}`);
  await expect(page.locator('.pill__label')).toHaveText(label(last));
});

test('resizing mid-page keeps the pill in sync', async ({ page }) => {
  await page.goto('./');
  await scrollToId(page, projects[2].id);
  await expect(page.locator('.pill__label')).toHaveText(label(2));
  await page.setViewportSize({ width: 375, height: 812 });
  await scrollToId(page, projects[1].id);
  await expect(page.locator('.pill__label')).toHaveText(label(1));
});

test.describe('with smooth scrolling (what most visitors get)', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });
  test('the menu lands exactly on a far chapter', async ({ page }) => {
    await page.goto('./');
    const last = projects[projects.length - 1];
    await page.locator('.topbar__projects').click();
    await page.locator(`#chapter-menu a[data-target="${last.id}"]`).click();
    await expect.poll(() => topOf(page, last.id), { timeout: 10_000 }).toBeLessThanOrEqual(2);
    await page.waitForTimeout(500); // stays put once Lenis settles
    expect(await topOf(page, last.id)).toBeLessThanOrEqual(2);
  });
  test('a deep link lands on its chapter and the pill names it', async ({ page }) => {
    const last = projects.length - 1;
    await page.goto(`./#${projects[last].id}`);
    await expect(page.locator('.pill__label')).toHaveText(label(last), { timeout: 30_000 });
  });

  test('resizing mid-page keeps the pill in sync', async ({ page }) => {
    await page.goto('./');
    await scrollToId(page, projects[2].id);
    await expect(page.locator('.pill__label')).toHaveText(label(2), { timeout: 30_000 });
    await page.setViewportSize({ width: 375, height: 812 });
    await scrollToId(page, projects[1].id);
    await expect(page.locator('.pill__label')).toHaveText(label(1), { timeout: 30_000 });
  });

  test('the pill names each chapter as you scroll to it', async ({ page }) => {
    await page.goto('./');
    for (const [i, p] of projects.entries()) {
      await scrollToId(page, p.id);
      await expect(page.locator('.pill__label')).toHaveText(label(i), { timeout: 30_000 });
    }
  });
});
