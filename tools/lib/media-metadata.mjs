// Finds published images that still carry EXIF, XMP or IPTC metadata.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export async function findImagesWithMetadata(roots) {
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
  return { checked, bad };
}
