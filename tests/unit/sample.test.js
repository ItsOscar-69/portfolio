import { it, expect } from 'vitest';
import { samplePoints, luminance } from '../../src/lib/sample.js';
import { mulberry32 } from '../../src/lib/rng.js';

const image = (w, h, rgba) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(rgba, i * 4);
  return { width: w, height: h, data };
};

it('returns the requested number of points inside the image bounds', () => {
  const r = samplePoints(image(4, 2, [255, 255, 255, 255]), 500, mulberry32(1));
  expect(r.count).toBe(500);
  expect(r.positions.length).toBe(1500);
  expect(r.extent).toEqual({ x: 1, y: 0.5 });
  for (let i = 0; i < 500; i++) {
    expect(Math.abs(r.positions[i * 3])).toBeLessThanOrEqual(1);
    expect(Math.abs(r.positions[i * 3 + 1])).toBeLessThanOrEqual(0.5);
  }
});
it('only samples visible pixels and keeps their colour', () => {
  const img = image(4, 2, [0, 0, 0, 255]);
  img.data.set([255, 0, 0, 255], 0); // top-left pixel is red, the rest black
  const r = samplePoints(img, 200, mulberry32(2));
  for (let i = 0; i < 200; i++) {
    expect(r.positions[i * 3]).toBeLessThan(-0.5);
    expect(r.positions[i * 3 + 1]).toBeGreaterThan(0);
    expect(r.colors[i * 3]).toBe(1);
    expect(r.colors[i * 3 + 1]).toBe(0);
  }
});
it('returns zero points when nothing is visible (all dark or all transparent)', () => {
  expect(samplePoints(image(3, 3, [0, 0, 0, 255]), 100, mulberry32(3)).count).toBe(0);
  expect(samplePoints(image(3, 3, [255, 255, 255, 0]), 100, mulberry32(3)).count).toBe(0);
});
it('is deterministic for the same seed', () => {
  const a = samplePoints(image(8, 8, [200, 120, 40, 255]), 50, mulberry32(9));
  const b = samplePoints(image(8, 8, [200, 120, 40, 255]), 50, mulberry32(9));
  expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
});
it('fits portrait images to the full height', () => {
  expect(samplePoints(image(2, 4, [255, 255, 255, 255]), 10, mulberry32(4)).extent).toEqual({ x: 0.5, y: 1 });
});
it('computes perceived brightness', () => {
  expect(luminance(255, 255, 255)).toBeCloseTo(1);
  expect(luminance(0, 0, 0)).toBe(0);
});
