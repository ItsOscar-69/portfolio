import { it, expect } from 'vitest';
import { pickTier, particleCount, TIER_SETTINGS } from '../../src/lib/tier.js';

it('treats software renderers as low', () => {
  expect(pickTier({ gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', cores: 16, width: 1920 })).toBe('low');
});
it('treats two-core machines as low', () => {
  expect(pickTier({ gpu: 'Apple GPU', cores: 2, width: 1440 })).toBe('low');
});
it('treats phone-sized screens as mid', () => {
  expect(pickTier({ gpu: 'Apple GPU', cores: 6, width: 390 })).toBe('mid');
});
it('treats quad-core laptops as mid', () => {
  expect(pickTier({ gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', cores: 4, width: 1366 })).toBe('mid');
});
it('gives a capable desktop high', () => {
  expect(pickTier({ gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', cores: 12, width: 1920 })).toBe('high');
});
it('scales particle counts by tier with a floor', () => {
  expect(particleCount(40000, 'high')).toBe(40000);
  expect(particleCount(40000, 'mid')).toBe(20000);
  expect(particleCount(40000, 'low')).toBe(8000);
  expect(particleCount(1000, 'low')).toBe(500);
});
it('caps pixel ratio per tier', () => {
  expect(TIER_SETTINGS.high.dprCap).toBe(2);
  expect(TIER_SETTINGS.mid.dprCap).toBe(1.5);
  expect(TIER_SETTINGS.low.dprCap).toBe(1);
});
