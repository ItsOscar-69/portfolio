// Fails if any published image still carries EXIF, XMP or IPTC metadata.
import { findImagesWithMetadata } from './lib/media-metadata.mjs';

const { checked, bad } = await findImagesWithMetadata(['public/projects', 'public/posters']);
if (bad.length) { console.error(`Images still carry metadata:\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log(`${checked} images checked: no EXIF, XMP or IPTC metadata.`);
