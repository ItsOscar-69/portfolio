import { it, expect } from 'vitest';
import fs from 'node:fs';
import sharp from 'sharp';
import { projects } from '../../src/content/projects.js';

const ids = ['hero', ...projects.map((p) => p.id), 'next'];

it('has a landscape and a portrait poster for every scene (run `npm run posters` after adding a project)', () => {
  const missing = ids.flatMap((id) => [`${id}.webp`, `${id}-portrait.webp`]).filter((f) => !fs.existsSync(`public/posters/${f}`));
  expect(missing, 'run `npm run posters`').toEqual([]);
});

it('portrait posters are 900×1600', async () => {
  for (const id of ids) {
    const { width, height } = await sharp(`public/posters/${id}-portrait.webp`).metadata();
    expect([id, width, height]).toEqual([id, 900, 1600]);
  }
});
