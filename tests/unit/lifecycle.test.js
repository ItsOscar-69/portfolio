import { it, expect } from 'vitest';
import { lifecyclePlan } from '../../src/lib/lifecycle.js';

it('loads the active scene and the one after it', () => {
  expect(lifecyclePlan(0, new Set(), 6)).toEqual({ load: [0, 1], dispose: [] });
});
it('keeps the scene behind and disposes scenes two or more away', () => {
  expect(lifecyclePlan(3, new Set([0, 1, 2, 3]), 6)).toEqual({ load: [4], dispose: [0, 1] });
});
it('never loads past the last scene', () => {
  expect(lifecyclePlan(5, new Set([4, 5]), 6)).toEqual({ load: [], dispose: [] });
});
it('does nothing for an empty layout', () => {
  expect(lifecyclePlan(-1, new Set(), 0)).toEqual({ load: [], dispose: [] });
});
