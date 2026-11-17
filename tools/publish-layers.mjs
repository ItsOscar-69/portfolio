// Crops each DEAD TIRED layer PNG (full 4193x4801 canvas) to its content, saves it as a small WebP,
// and records where it sits in layers.json. A fully opaque layer (the shirt) is recorded as a flat colour.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'raw/tee/layers';
const OUT = 'public/projects/dead-tired/layers';
const SCALE = 0.3; // published pixels per canvas pixel
const slug = (file) => file.replace(/\.png$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hex = (values) => `#${values.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const files = (await fs.readdir(SRC)).filter((f) => f.toLowerCase().endsWith('.png')).sort();
let width;
let height;
const layers = [];
for (const file of files) {
  const src = path.join(SRC, file);
  const meta = await sharp(src).metadata();
  width ??= meta.width;
  height ??= meta.height;
  if (meta.width !== width || meta.height !== height) throw new Error(`${file} is ${meta.width}x${meta.height}, expected ${width}x${height}`);
  const name = file.replace(/^\d+\s*/, '').replace(/\.png$/i, '');
  const stats = await sharp(src).stats();
  if (stats.isOpaque) {
    layers.push({ name, fill: hex(stats.channels.slice(0, 3).map((c) => c.mean)), x: 0, y: 0, w: width, h: height });
    console.log(`${file}: flat colour ${layers.at(-1).fill}`);
    continue;
  }
  const { info } = await sharp(src).trim().toBuffer({ resolveWithObject: true });
  const box = { x: -info.trimOffsetLeft, y: -info.trimOffsetTop, w: info.width, h: info.height };
  const out = `${slug(file)}.webp`;
  await sharp(src)
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .resize({ width: Math.max(1, Math.round(box.w * SCALE)) })
    .webp({ quality: 86, alphaQuality: 90, effort: 5 })
    .toFile(path.join(OUT, out));
  layers.push({ name, file: out, ...box });
  console.log(`${file}: ${out} at ${box.x},${box.y} (${box.w}x${box.h})`);
}
await fs.writeFile(path.join(OUT, 'layers.json'), `${JSON.stringify({ width, height, layers }, null, 2)}\n`);
console.log(`wrote ${OUT}/layers.json (${layers.length} layers)`);
