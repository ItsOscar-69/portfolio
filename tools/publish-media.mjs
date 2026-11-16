// Converts raw images to WebP (1800 px plus a 900 px "-900" version) with all metadata stripped.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const P = 'public/projects';
const JOBS = [
  { from: 'raw/shots/halcyon-hero.png', to: `${P}/halcyon-somatics/shot-hero.webp` },
  { from: 'raw/shots/halcyon-seraph.png', to: `${P}/halcyon-somatics/shot-seraph.webp` },
  { from: 'raw/shots/halcyon-terms.png', to: `${P}/halcyon-somatics/shot-terms.webp` },
  { from: 'raw/shots/halcyon-hero.png', to: `${P}/halcyon-somatics/cover.webp`, width: 1200, single: true },
  { from: 'raw/covers/ascii.png', to: `${P}/ascii-mirror/cover.webp` },
  { from: 'raw/covers/pico.png', to: `${P}/pico-light-show/cover.webp` },
  { from: 'raw/tee/on-black.jpg', to: `${P}/dead-tired/on-black.webp` },
  { from: 'raw/tee/mockup.jpg', to: `${P}/dead-tired/mockup.webp` },
  { from: 'raw/tee/alt-stump.jpg', to: `${P}/dead-tired/alt-stump.webp` },
  { from: 'raw/tee/print.png', to: `${P}/dead-tired/cover.webp`, width: 1200, single: true, flatten: '#000000' },
];
const COPIES = [{ from: 'raw/pico/boot.py', to: `${P}/pico-light-show/boot.py` }];

async function toWebp(from, to, width, flatten) {
  let image = sharp(from).rotate().resize({ width, withoutEnlargement: true });
  if (flatten) image = image.flatten({ background: flatten });
  await image.webp({ quality: 82, effort: 5 }).toFile(to); // sharp drops EXIF/XMP/IPTC unless asked to keep them
}

for (const job of JOBS) {
  await fs.mkdir(path.dirname(job.to), { recursive: true });
  await toWebp(job.from, job.to, job.width ?? 1800, job.flatten);
  if (!job.single) await toWebp(job.from, job.to.replace(/\.webp$/, '-900.webp'), 900, job.flatten);
  console.log(`wrote ${job.to}`);
}
for (const copy of COPIES) {
  await fs.mkdir(path.dirname(copy.to), { recursive: true });
  await fs.copyFile(copy.from, copy.to);
  console.log(`copied ${copy.to}`);
}
