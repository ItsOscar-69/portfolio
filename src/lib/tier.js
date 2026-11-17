const LOW_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mali-[4t]\d\d\b|adreno \(tm\) [2-4]\d\d\b|powervr sgx/i;

export const TIER_SETTINGS = {
  high: { dprCap: 2, particleScale: 1, bloom: true },
  mid: { dprCap: 1.5, particleScale: 0.5, bloom: true },
  low: { dprCap: 1, particleScale: 0.2, bloom: false },
};

// A world's bloom request ({ strength, radius, threshold }) when its tier allows bloom, otherwise null.
// The low tier never blooms (spec §8.1).
export function bloomFor(tier, request) {
  if (!request) return null;
  return (TIER_SETTINGS[tier] || TIER_SETTINGS.mid).bloom ? request : null;
}

export function pickTier({ gpu = '', cores = 4, width = 1280 } = {}) {
  if (LOW_GPU.test(gpu) || cores <= 2) return 'low';
  if (width < 900 || cores <= 4) return 'mid';
  return 'high';
}

export function particleCount(base, tier) {
  const scale = (TIER_SETTINGS[tier] || TIER_SETTINGS.mid).particleScale;
  return Math.max(500, Math.round(base * scale));
}
