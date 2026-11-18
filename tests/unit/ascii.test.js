import { it, expect } from 'vitest';
import { RAMP, INK, PAPER, CELL_PX, charFor, gridFor, asciiRows } from '../../src/lib/ascii.js';

it('uses the spec’s ramp and colours', () => {
  expect(RAMP).toBe(' .:-=+*#%@');
  expect([INK, PAPER]).toEqual(['#39ff88', '#020604']);
  expect(CELL_PX).toBe(10);
});

it('maps brightness to the ramp, darkest first, clamping out-of-range values', () => {
  expect([0, 0.0999, 0.1, 0.5, 0.95, 1].map(charFor).join('')).toBe('  .+@@');
  expect(charFor(-1)).toBe(' ');
  expect(charFor(2)).toBe('@');
});

it('fits whole character cells into an area', () => {
  expect(gridFor(1440, 900)).toEqual({ cols: 144, rows: 90 });
  expect(gridFor(375, 812, 9)).toEqual({ cols: 41, rows: 90 });
  expect(gridFor(3, 3)).toEqual({ cols: 1, rows: 1 });
});

it('turns pixels into rows of characters, and mirrors them like a selfie', () => {
  const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 128, 128, 128, 255, 255, 255, 255, 255]);
  expect(asciiRows(rgba, 2, 2)).toEqual([' @', '+@']);
  expect(asciiRows(rgba, 2, 2, { mirror: true })).toEqual(['@ ', '@+']);
});
