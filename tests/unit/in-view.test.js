import { it, expect } from 'vitest';
import { isFullyInView } from '../../src/lib/in-view.js';

const e = (ratio, visible, viewport) => ({ intersectionRatio: ratio, intersectionRect: { height: visible }, rootBounds: viewport === null ? null : { height: viewport } });

it('is true once 90% of the element is visible', () => {
  expect(isFullyInView(e(0.95, 500, 900))).toBe(true);
  expect(isFullyInView(e(0.6, 300, 900))).toBe(false);
});
it('counts an element taller than the screen as in view once it fills 90% of the screen height', () => {
  expect(isFullyInView(e(0.7, 350, 375))).toBe(true);
  expect(isFullyInView(e(0.5, 250, 375))).toBe(false);
});
it('is false without a root', () => {
  expect(isFullyInView(e(1, 500, null))).toBe(false);
});
