import { it, expect } from 'vitest';
import fs from 'node:fs';
import { projects } from '../../src/content/projects.js';

it('has a poster for every scene (run `npm run posters` after adding a project)', () => {
  const missing = ['hero', ...projects.map((p) => p.id), 'next'].filter((id) => !fs.existsSync(`public/posters/${id}.webp`));
  expect(missing, 'run `npm run posters`').toEqual([]);
});
