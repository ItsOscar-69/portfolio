import { it, expect } from 'vitest';
import { mulberry32 } from '../../src/lib/rng.js';

it('repeats the same sequence for the same seed', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 20; i++) expect(a()).toBe(b());
});
it('gives different sequences for different seeds', () => {
  expect(mulberry32(1)()).not.toBe(mulberry32(2)());
});
it('stays inside [0, 1) and averages near 0.5', () => {
  const r = mulberry32(7);
  let sum = 0;
  for (let i = 0; i < 2000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); sum += v; }
  expect(sum / 2000).toBeGreaterThan(0.45);
  expect(sum / 2000).toBeLessThan(0.55);
});
