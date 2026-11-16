import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from './lib/browser.mjs';

await fs.mkdir('raw/covers', { recursive: true });
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  for (const name of ['ascii', 'pico']) {
    await page.goto(pathToFileURL(path.resolve(`tools/covers/${name}.html`)).href);
    await page.waitForFunction(() => window.coverReady === true);
    await page.locator('canvas').screenshot({ path: `raw/covers/${name}.png` });
    console.log(`rendered raw/covers/${name}.png`);
  }
} finally {
  await browser.close();
}
