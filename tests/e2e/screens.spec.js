import { test } from '@playwright/test';

const VIEWPORTS = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 375, height: 812 }];

for (const vp of VIEWPORTS) {
  test(`review screenshots (${vp.name})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('./');
    const ids = await page.locator('.scene').evaluateAll((els) => els.map((el) => el.id));
    for (const id of ids) {
      await page.evaluate((el) => {
        const scene = document.getElementById(el);
        const track = scene.querySelector('.scene__track');
        const top = scene.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + (track.offsetHeight - window.innerHeight) * 0.6);
      }, id);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `screens/${vp.name}-${id}.png` });
      const panel = page.locator(`#${id} .chapter__panel`);
      if (await panel.count()) {
        await panel.evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(800);
        await page.screenshot({ path: `screens/${vp.name}-${id}-panel.png` });
      }
    }
  });
}
