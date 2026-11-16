// Fails if any published image still carries EXIF, XMP or IPTC metadata.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const roots = ['public/projects', 'public/posters'];
const bad = [];
let checked = 0;
async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else if (/\.(webp|png|jpe?g)$/i.test(e.name)) {
      const meta = await sharp(full).metadata();
      checked++;
      if (meta.exif || meta.xmp || meta.iptc) bad.push(full);
    }
  }
}
for (const root of roots) await walk(root);
if (bad.length) { console.error(`Images still carry metadata:\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log(`${checked} images checked: no EXIF, XMP or IPTC metadata.`);
