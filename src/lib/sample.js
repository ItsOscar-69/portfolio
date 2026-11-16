export function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Turns an image into `count` particles. Longer image side spans -1..1; z comes from brightness.
export function samplePoints(image, count, rng, { minAlpha = 128, minLuma = 0.08, depth = 0.35 } = {}) {
  const { data, width, height } = image;
  const aspect = width / height;
  const extent = aspect >= 1 ? { x: 1, y: 1 / aspect } : { x: aspect, y: 1 };
  const candidates = [];
  for (let o = 0; o < data.length; o += 4) {
    if (data[o + 3] >= minAlpha && luminance(data[o], data[o + 1], data[o + 2]) >= minLuma) candidates.push(o);
  }
  if (!candidates.length) return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0, extent };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const o = candidates[Math.floor(rng() * candidates.length)];
    const px = (o / 4) % width;
    const py = Math.floor(o / 4 / width);
    const u = (px + rng()) / width;
    const v = (py + rng()) / height;
    positions[i * 3] = (u * 2 - 1) * extent.x;
    positions[i * 3 + 1] = (1 - v * 2) * extent.y;
    positions[i * 3 + 2] = (luminance(data[o], data[o + 1], data[o + 2]) - 0.5) * depth;
    colors[i * 3] = data[o] / 255;
    colors[i * 3 + 1] = data[o + 1] / 255;
    colors[i * 3 + 2] = data[o + 2] / 255;
  }
  return { positions, colors, count, extent };
}
