// GLSL leaves smoothstep(edge0, edge1, x) undefined when edge0 >= edge1. SwiftShader returns the "expected" value,
// but a phone GPU may not, so every call keeps its edges in rising order: write 1.0 - smoothstep(lo, hi, x).
import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const files = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : /\.js$/.test(e.name) ? [path.join(dir, e.name)] : []));

it('every literal smoothstep in the shaders has its edges in rising order', () => {
  const bad = [];
  for (const f of files('src')) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/smoothstep\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,/g)) {
      if (parseFloat(m[1]) >= parseFloat(m[2])) bad.push(`${f}: ${m[0]}`);
    }
  }
  expect(bad).toEqual([]);
});
