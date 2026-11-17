// Spreads points along polylines in proportion to segment length × weight.
// polylines: [{ points: [x0, y0, x1, y1, ...], weight = 1, color = [r, g, b] (0..1) }]

export function polylineLength(points) {
  let total = 0;
  for (let i = 2; i < points.length; i += 2) total += Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
  return total;
}

const WHITE = [1, 1, 1];

export function samplePolylines(polylines, count, rng) {
  const segments = []; // pairs: polyline index, end-point offset
  const cumulative = [];
  let total = 0;
  polylines.forEach((line, index) => {
    const weight = line.weight ?? 1;
    if (!(weight > 0)) return;
    const p = line.points;
    for (let i = 2; i < p.length; i += 2) {
      const length = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]) * weight;
      if (!(length > 0)) continue;
      total += length;
      segments.push(index, i);
      cumulative.push(total);
    }
  });
  if (!(total > 0) || !(count > 0)) {
    return { positions: new Float32Array(0), colors: new Float32Array(0), lines: new Uint32Array(0), count: 0 };
  }

  const positions = new Float32Array(count * 2);
  const colors = new Float32Array(count * 3);
  const lines = new Uint32Array(count);
  for (let k = 0; k < count; k++) {
    const r = rng() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const index = segments[lo * 2];
    const i = segments[lo * 2 + 1];
    const line = polylines[index];
    const p = line.points;
    const t = rng();
    positions[k * 2] = p[i - 2] + (p[i] - p[i - 2]) * t;
    positions[k * 2 + 1] = p[i - 1] + (p[i + 1] - p[i - 1]) * t;
    colors.set(line.color || WHITE, k * 3);
    lines[k] = index;
  }
  return { positions, colors, lines, count };
}

// Splits a flat [x0, y0, x1, y1, ...] run into pieces, starting a new piece wherever two
// consecutive points are further apart than maxGap. Pieces with fewer than 2 points are dropped.
export function splitAtJumps(points, maxGap) {
  const pieces = [];
  let start = 0;
  const flush = (end) => {
    if (end - start >= 4) pieces.push(Float32Array.from(Array.prototype.slice.call(points, start, end)));
    start = end;
  };
  for (let i = 2; i < points.length; i += 2) {
    if (Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]) > maxGap) flush(i);
  }
  flush(points.length);
  return pieces;
}
