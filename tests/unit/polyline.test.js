import { it, expect } from 'vitest';
import { polylineLength, samplePolylines } from '../../src/lib/polyline.js';
import { mulberry32 } from '../../src/lib/rng.js';

const line = (points, extra = {}) => ({ points, color: [1, 0.5, 0], ...extra });

it('measures a polyline', () => {
  expect(polylineLength([0, 0, 3, 4, 3, 10])).toBeCloseTo(11);
  expect(polylineLength([5, 5])).toBe(0);
});

it('puts every point on the line and keeps its colour', () => {
  const r = samplePolylines([line([0, 0, 10, 0])], 300, mulberry32(1));
  expect(r.count).toBe(300);
  expect(r.positions.length).toBe(600);
  for (let k = 0; k < 300; k++) {
    expect(r.positions[k * 2 + 1]).toBe(0);
    expect(r.positions[k * 2]).toBeGreaterThanOrEqual(0);
    expect(r.positions[k * 2]).toBeLessThanOrEqual(10);
  }
  expect(Array.from(r.colors.slice(0, 3))).toEqual([1, 0.5, 0]);
});

it('follows bends in a polyline', () => {
  const r = samplePolylines([line([0, 0, 10, 0, 10, 10])], 400, mulberry32(2));
  for (let k = 0; k < 400; k++) {
    const x = r.positions[k * 2];
    const y = r.positions[k * 2 + 1];
    expect(y === 0 || x === 10).toBe(true);
  }
});

it('spreads points by length times weight', () => {
  const r = samplePolylines([line([0, 0, 10, 0]), line([0, 5, 10, 5], { weight: 3 })], 4000, mulberry32(3));
  let onSecond = 0;
  for (let k = 0; k < 4000; k++) if (r.positions[k * 2 + 1] === 5) onSecond++;
  expect(onSecond / 4000).toBeGreaterThan(0.7);
  expect(onSecond / 4000).toBeLessThan(0.8);
});

it('records which polyline each point came from', () => {
  const r = samplePolylines([line([0, 0, 1, 0], { weight: 0 }), line([0, 1, 1, 1])], 20, mulberry32(5));
  expect(Array.from(r.lines).every((i) => i === 1)).toBe(true);
});

it('returns zero points when nothing can be sampled', () => {
  expect(samplePolylines([line([0, 0, 0, 0]), line([0, 0, 5, 0], { weight: 0 })], 50, mulberry32(4)).count).toBe(0);
  expect(samplePolylines([], 50, mulberry32(4)).count).toBe(0);
});

it('defaults the colour to white', () => {
  const r = samplePolylines([{ points: [0, 0, 1, 0] }], 1, mulberry32(6));
  expect(Array.from(r.colors)).toEqual([1, 1, 1]);
});

it('is deterministic for the same seed', () => {
  const a = samplePolylines([line([0, 0, 4, 9, 2, 1])], 64, mulberry32(9));
  const b = samplePolylines([line([0, 0, 4, 9, 2, 1])], 64, mulberry32(9));
  expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
});
