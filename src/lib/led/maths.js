// The helpers from Oscar's MicroPico boot.py, ported line for line (the numbers in comments are boot.py's lines).
// Pixels are [r, g, b] arrays of plain numbers, like boot.py's tuples. They are not typed arrays, because boot.py
// never clamps below 0: a spark just before the first LED adds a negative amount to the next one (draw_dot, f < 0).

export const NUM_LEDS = 20; // 5
export const BRIGHTNESS = 0.3; // 7
export const EFFECT_SECONDS = 15; // 9
export const FADE_FRAMES = 50; // 10
export const FRAME_MS = 20; // 11
export const FPS = 1000 / FRAME_MS;

// Python's int() truncates toward zero, and its % never returns a negative number.
export const int = Math.trunc;
export const pyMod = (a, n) => ((a % n) + n) % n;

// 38-40: gamma correction with the brightness baked in. Index 0 stays 0; any other input keeps at least 1.
// The screen shows the pixel values before this table (see the plan); the real strip is driven through it.
export const GAMMA = Array.from({ length: 256 }, (_, i) => (i === 0 ? 0 : Math.max(1, int((i / 255) ** 2 * 255 * BRIGHTNESS + 0.5))));

// 43-44: a 0-255 sine table.
export const SIN8 = Array.from({ length: 256 }, (_, i) => int(127.5 + 127.5 * Math.sin((i * 2 * Math.PI) / 256)));

// 56-76: h, s, v all 0-255 -> [r, g, b]
export function hsv(h, s = 255, v = 255) {
  h &= 255;
  if (s === 0) return [v, v, v];
  const region = Math.floor(h / 43);
  const rem = (h - region * 43) * 6;
  const p = (v * (255 - s)) >> 8;
  const q = (v * (255 - ((s * rem) >> 8))) >> 8;
  const t = (v * (255 - ((s * (255 - rem)) >> 8))) >> 8;
  if (region === 0) return [v, t, p];
  if (region === 1) return [q, v, p];
  if (region === 2) return [p, v, t];
  if (region === 3) return [p, q, v];
  if (region === 4) return [t, p, v];
  return [v, p, q];
}

// 79-83: keep is 0-256, how much of each pixel survives this frame.
export function fadeAll(px, keep) {
  for (let i = 0; i < NUM_LEDS; i++) {
    const [r, g, b] = px[i];
    px[i] = [(r * keep) >> 8, (g * keep) >> 8, (b * keep) >> 8];
  }
}

// 86-92: additive blend, clipped to 255 (and, as in boot.py, never clipped below 0).
export function add(px, i, colour, k = 1.0) {
  if (i >= 0 && i < NUM_LEDS) {
    const [r, g, b] = px[i];
    px[i] = [Math.min(255, r + int(colour[0] * k)), Math.min(255, g + int(colour[1] * k)), Math.min(255, b + int(colour[2] * k))];
  }
}

// 95-100: an anti-aliased dot at a fractional position.
export function drawDot(px, pos, colour) {
  const i = int(pos);
  const f = pos - i;
  add(px, i, colour, 1 - f);
  add(px, i + 1, colour, f);
}

// 195-203: 0-255 heat -> black / red / orange / yellow / white
export function heatColour(heat) {
  const t192 = (heat * 191) >> 8;
  const ramp = (t192 & 63) << 2;
  if (t192 > 128) return [255, 255, ramp];
  if (t192 > 64) return [255, ramp, 0];
  return [ramp, 0, 0];
}
