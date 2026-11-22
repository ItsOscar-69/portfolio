// Builds public/halcyon/: the original page with self-hosted fonts and a form that can't submit anywhere.
import fs from 'node:fs/promises';
import path from 'node:path';
import { swapFonts, lockForm, rewriteFontCss, labelRailMark } from './lib/halcyon-transform.mjs';

const SRC = 'raw/halcyon';
const OUT = 'public/halcyon';
const FONT_CSS = [
  '@fontsource/ibm-plex-mono/400.css',
  '@fontsource/ibm-plex-mono/500.css',
  '@fontsource/michroma/400.css',
  '@fontsource/noto-sans-jp/400.css',
  '@fontsource/noto-sans-jp/700.css',
];

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(path.join(OUT, 'assets'), { recursive: true });
await fs.mkdir(path.join(OUT, 'fonts', 'files'), { recursive: true });

const html = await fs.readFile(path.join(SRC, 'index.html'), 'utf8');
await fs.writeFile(path.join(OUT, 'index.html'), labelRailMark(lockForm(swapFonts(html))));
for (const file of ['styles.css', 'main.js', 'boot-gate.js', 'assets/body-wireframe.svg']) {
  await fs.copyFile(path.join(SRC, file), path.join(OUT, file));
}

let css = '';
for (const spec of FONT_CSS) {
  const file = path.join('node_modules', ...spec.split('/'));
  const { css: rewritten, files } = rewriteFontCss(await fs.readFile(file, 'utf8'), 'files/');
  for (const name of files) await fs.copyFile(path.join(path.dirname(file), 'files', name), path.join(OUT, 'fonts', 'files', name));
  css += `/* ${spec} */\n${rewritten}\n`;
}
await fs.writeFile(path.join(OUT, 'fonts', 'fonts.css'), css);
console.log(`HALCYON copy written to ${OUT}`);
