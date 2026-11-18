// The ASCII Mirror's look (spec §4.3): brightness is mapped to the ramp ' .:-=+*#%@', in green on near-black.
export const RAMP = ' .:-=+*#%@';
export const INK = '#39ff88';
export const PAPER = '#020604';
export const HOT = '#e9fff2'; // the highlighted part (the printed camera mount) is drawn near-white
export const CELL_PX = 10; // CSS px per character cell in the 3D world

// The ramp character for a brightness from 0 (dark) to 1 (bright). The ascii world's shader picks the same index.
export function charFor(lum) {
  const i = Math.min(RAMP.length - 1, Math.max(0, Math.floor(lum * RAMP.length)));
  return RAMP[i];
}

// How many whole character cells fit an area.
export function gridFor(width, height, cell = CELL_PX) {
  return { cols: Math.max(1, Math.floor(width / cell)), rows: Math.max(1, Math.floor(height / cell)) };
}

// RGBA pixels (cols × rows, top row first, as getImageData gives them) → rows of ramp characters. mirror flips each
// row left to right, like a selfie.
export function asciiRows(rgba, cols, rows, { mirror = false } = {}) {
  const out = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + (mirror ? cols - 1 - x : x)) * 4;
      line += charFor((0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255);
    }
    out.push(line);
  }
  return out;
}
