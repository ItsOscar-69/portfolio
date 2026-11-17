import { it, expect } from 'vitest';
import { Color } from 'three';
import { createBloom } from '../../src/stage/bloom.js';

it('restores the renderer’s clearing even if the bloom pass throws', () => {
  const calls = [];
  const renderer = {
    autoClear: true,
    getClearColor: (c) => c.set(0x090909),
    getClearAlpha: () => 1,
    setClearColor: (c, a) => calls.push([new Color(c).getHex(), a]),
    setRenderTarget: () => { throw new Error('boom'); },
    clear: () => {},
  };
  const bloom = createBloom();
  bloom.resize(64, 32);
  expect(() => bloom.apply(renderer, {}, { strength: 1, radius: 0.5, threshold: 0.1 })).toThrow('boom');
  expect(renderer.autoClear).toBe(true);
  expect(calls.at(-1)).toEqual([0x090909, 1]);
});
