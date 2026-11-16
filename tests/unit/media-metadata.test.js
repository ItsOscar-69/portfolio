import { it, expect } from 'vitest';
import { findImagesWithMetadata } from '../../tools/lib/media-metadata.mjs';

it('no published image carries EXIF, XMP or IPTC metadata', async () => {
  const { checked, bad } = await findImagesWithMetadata(['public/projects', 'public/posters']);
  expect(bad).toEqual([]);
  expect(checked).toBeGreaterThan(0);
}, 60_000);
