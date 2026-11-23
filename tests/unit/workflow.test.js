import { it, expect } from 'vitest';
import fs from 'node:fs';

const yml = fs.readFileSync('.github/workflows/deploy.yml', 'utf8').replace(/\r\n/g, '\n'); // CRLF on Windows checkouts

it('pins every action to a full commit SHA', () => {
  const uses = [...yml.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  expect(uses).toHaveLength(4);
  for (const u of uses) expect(u).toMatch(/^actions\/[\w-]+@[0-9a-f]{40}$/);
});

it('builds on Node 22 and runs the checks and unit tests before building', () => {
  expect(yml).toMatch(/node-version:\s*22\b/);
  const order = ['npm ci', 'npm run check', 'npm run check:media', 'npm test', 'npm run build'].map((s) => yml.indexOf(`run: ${s}\n`));
  expect(order.every((i) => i > 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});
