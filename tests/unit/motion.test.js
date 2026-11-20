import { it, expect } from 'vitest';
import { damp } from '../../src/lib/motion.js';

it('matches the per-frame share at 60 fps', () => {
  expect(damp(0.08, 1 / 60)).toBeCloseTo(0.08, 10);
});

it('two 120 Hz frames move as far as one 60 Hz frame', () => {
  const d = damp(0.08, 1 / 120);
  expect(1 - (1 - d) ** 2).toBeCloseTo(0.08, 10);
});

it('moves nothing in a zero-length frame and never overshoots in a long one', () => {
  expect(damp(0.08, 0)).toBe(0);
  expect(damp(0.08, 0.1)).toBeLessThan(1);
});
