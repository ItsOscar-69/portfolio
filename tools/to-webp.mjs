// Usage: node tools/to-webp.mjs <input> <output.webp>
// Writes a 1800 px WebP and a 900 px "-900.webp" sibling, with all metadata stripped.
import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
if (!input || !output || !/\.webp$/i.test(output)) {
  console.error('Usage: node tools/to-webp.mjs <input> <output.webp>');
  process.exit(1);
}
for (const [to, width] of [[output, 1800], [output.replace(/\.webp$/i, '-900.webp'), 900]]) {
  // sharp drops EXIF/XMP/IPTC unless asked to keep them
  await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(to);
  console.log(`wrote ${to}`);
}
