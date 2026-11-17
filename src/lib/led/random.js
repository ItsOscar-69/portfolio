import { mulberry32 } from '../rng.js';

// boot.py's three random calls, drawn from one seeded stream (like Python's single global random) so a run can be
// replayed exactly. tools/led-reference.py gives the real boot.py the same stream, defined the same way.
export function createRandom(seed) {
  const next = mulberry32(seed);
  return {
    randint: (a, b) => a + Math.floor(next() * (b - a + 1)),
    uniform: (a, b) => a + (b - a) * next(),
    choice: (list) => list[Math.floor(next() * list.length)],
  };
}
