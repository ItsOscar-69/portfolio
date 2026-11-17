import { it, expect } from 'vitest';
import fs from 'node:fs';
import { GAMMA, SIN8, NUM_LEDS, FPS, hsv, fadeAll, add, drawDot, heatColour, int, pyMod } from '../../src/lib/led/maths.js';
import { createRandom } from '../../src/lib/led/random.js';

const ref = JSON.parse(fs.readFileSync('tests/fixtures/boot-reference.json', 'utf8'));
const strip = (c = [0, 0, 0]) => Array.from({ length: NUM_LEDS }, () => c.slice());

it('builds exactly the gamma and sine tables boot.py builds', () => {
  expect(GAMMA).toEqual(ref.gamma);
  expect(SIN8).toEqual(ref.sin8);
  expect([GAMMA[0], GAMMA[1], GAMMA[128], GAMMA[255]]).toEqual([0, 1, 19, 77]);
  expect([NUM_LEDS, FPS]).toEqual([20, 50]);
});

it('converts hsv exactly like boot.py, including hues past 255 and below 0', () => {
  for (const [key, want] of Object.entries(ref.hsv)) {
    const [h, s, v] = key.split(',').map(Number);
    expect(hsv(h, s, v), `hsv(${key})`).toEqual(want);
  }
});

it('truncates and wraps numbers the way Python does', () => {
  expect(int(1.9)).toBe(1);
  expect(int(-1.5)).toBe(-1);
  expect(pyMod(-3, 55)).toBe(52);
  expect(pyMod(57, 55)).toBe(2);
});

it('fades, adds with a 255 ceiling, and ignores LEDs off the strip', () => {
  const px = strip([200, 100, 10]);
  fadeAll(px, 128);
  expect(px[0]).toEqual([100, 50, 5]);
  add(px, 0, [200, 10, 0]);
  expect(px[0]).toEqual([255, 60, 5]);
  add(px, -1, [9, 9, 9]);
  add(px, NUM_LEDS, [9, 9, 9]);
  expect(px.slice(1)).toEqual(strip([100, 50, 5]).slice(1));
});

it('splits a dot between its two nearest LEDs', () => {
  const px = strip();
  drawDot(px, 2.25, [100, 200, 40]);
  expect(px[2]).toEqual([75, 150, 30]);
  expect(px[3]).toEqual([25, 50, 10]);
});

it('keeps boot.py’s behaviour just before the strip’s first LED, where a dot adds a negative amount', () => {
  const px = strip([10, 10, 10]);
  drawDot(px, -0.5, [100, 100, 100]);
  expect(px[0]).toEqual([160, 160, 160]);
  expect(px[1]).toEqual([-40, -40, -40]);
});

it('maps heat to black, red, orange, yellow and white', () => {
  expect(heatColour(0)).toEqual([0, 0, 0]);
  expect(heatColour(80)).toEqual([236, 0, 0]);
  expect(heatColour(130)).toEqual([255, 128, 0]);
  expect(heatColour(255)).toEqual([255, 255, 248]);
});

it('draws repeatable random numbers in boot.py’s ranges', () => {
  const a = createRandom(5);
  const b = createRandom(5);
  const draws = Array.from({ length: 2000 }, () => a.randint(0, 5));
  expect(draws).toEqual(Array.from({ length: 2000 }, () => b.randint(0, 5)));
  expect([Math.min(...draws), Math.max(...draws)]).toEqual([0, 5]);
  const spread = Array.from({ length: 500 }, () => a.uniform(-0.7, 0.7));
  expect(Math.min(...spread)).toBeGreaterThanOrEqual(-0.7);
  expect(Math.max(...spread)).toBeLessThan(0.7);
  expect(['x', 'y', 'z']).toContain(a.choice(['x', 'y', 'z']));
});
