// Validates a layer-stack manifest (layers.json): a canvas size plus layers listed back to front,
// each either a bare .webp file name (beside the manifest) or a flat fill colour, with its box in canvas pixels.
const HEX = /^#[0-9a-f]{6}$/i;
const isCount = (v) => Number.isInteger(v) && v > 0;
const isOffset = (v) => Number.isInteger(v) && v >= 0;
const isBareWebp = (v) => typeof v === 'string' && /^[^/\\]+\.webp$/i.test(v) && !v.startsWith('.');

export function parseLayerManifest(json) {
  if (!json || typeof json !== 'object') throw new Error('layer manifest must be an object');
  const { width, height, layers } = json;
  if (!isCount(width) || !isCount(height)) throw new Error('layer manifest needs whole-number width and height');
  if (!Array.isArray(layers) || layers.length === 0) throw new Error('layer manifest needs at least one layer');
  return {
    width,
    height,
    layers: layers.map((l, i) => {
      const at = `layer ${i + 1}${l && typeof l.name === 'string' && l.name ? ` (${l.name})` : ''}`;
      if (!l || typeof l.name !== 'string' || !l.name) throw new Error(`${at}: needs a name`);
      const hasFile = isBareWebp(l.file);
      const hasFill = typeof l.fill === 'string' && HEX.test(l.fill);
      if (hasFile === hasFill) throw new Error(`${at}: needs exactly one of "file" (a .webp name beside the manifest) or "fill" (a colour like #161616)`);
      const inside = isOffset(l.x) && isOffset(l.y) && isCount(l.w) && isCount(l.h) && l.x + l.w <= width && l.y + l.h <= height;
      if (!inside) throw new Error(`${at}: box must sit inside the ${width}x${height} canvas`);
      return { name: l.name, ...(hasFile ? { file: l.file } : { fill: l.fill }), x: l.x, y: l.y, w: l.w, h: l.h };
    }),
  };
}
