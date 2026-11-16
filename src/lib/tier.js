const LOW_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mali-[4t]\d\d\b|adreno \(tm\) [2-4]\d\d\b|powervr sgx/i;

export const TIER_SETTINGS = {
  high: { dprCap: 2, particleScale: 1 },
  mid: { dprCap: 1.5, particleScale: 0.5 },
  low: { dprCap: 1, particleScale: 0.2 },
};

export function pickTier({ gpu = '', cores = 4, width = 1280 } = {}) {
  if (LOW_GPU.test(gpu) || cores <= 2) return 'low';
  if (width < 900 || cores <= 4) return 'mid';
  return 'high';
}

export function particleCount(base, tier) {
  const scale = (TIER_SETTINGS[tier] || TIER_SETTINGS.mid).particleScale;
  return Math.max(500, Math.round(base * scale));
}
