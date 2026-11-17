import { NUM_LEDS, SIN8, int, pyMod, hsv, fadeAll, drawDot, heatColour } from './maths.js';

// The seven effects from Oscar's MicroPico boot.py (lines 106-283), ported line for line. As in boot.py, each is a
// generator that draws one frame into px and then yields. The number it yields is the boot.py line that frame was
// about, which the code panel highlights.

function* powerUp(px) {
  const centre = (NUM_LEDS - 1) / 2;
  let pos = 0.0;
  let vel = 0.12;
  while (pos < centre) {
    fadeAll(px, 140);
    drawDot(px, pos, [160, 190, 255]);
    drawDot(px, NUM_LEDS - 1 - pos, [160, 190, 255]);
    pos += vel;
    vel *= 1.07;
    yield 113;
  }
  for (let k = 0; k < 8; k++) {
    const v = 255 - k * 25;
    for (let i = 0; i < NUM_LEDS; i++) px[i] = [v, v, v];
    yield 121;
  }
  let radius = 0.0;
  while (radius < centre + 3) {
    for (let i = 0; i < NUM_LEDS; i++) {
      const d = Math.abs(i - centre);
      if (d <= radius - 1) px[i] = hsv(int((d * 256) / NUM_LEDS), 255, 255);
      else if (d <= radius) px[i] = [255, 255, 255];
      else {
        const [r, g, b] = px[i];
        px[i] = [(r * 200) >> 8, (g * 200) >> 8, (b * 200) >> 8];
      }
    }
    radius += 0.35;
    yield 128;
  }
  while (true) yield 137;
}

function* rainbowGlitter(px, random) {
  let t = 0;
  while (true) {
    for (let i = 0; i < NUM_LEDS; i++) {
      const v = 140 + ((SIN8[(i * 20 - t * 4) & 255] * 115) >> 8);
      px[i] = hsv(t * 2 + Math.floor((i * 256) / NUM_LEDS), 255, v);
    }
    let line = 146;
    if (random.randint(0, 99) < 25) {
      px[random.randint(0, NUM_LEDS - 1)] = [255, 255, 255];
      line = 148;
    }
    t += 1;
    yield line;
  }
}

function* twinComets(px, random) {
  let aPos = 0.0;
  let aVel = 0.35;
  let bPos = NUM_LEDS - 1.0;
  let bVel = -0.27;
  const last = NUM_LEDS - 1;
  let hue = 0;
  let sparks = [];
  let wasClose = false;
  while (true) {
    fadeAll(px, 185);
    let line = 181;

    aPos += aVel;
    bPos += bVel;
    if (aPos < 0 || aPos > last) {
      aVel = -aVel;
      aPos = Math.max(0.0, Math.min(last, aPos));
      line = 168;
    }
    if (bPos < 0 || bPos > last) {
      bVel = -bVel;
      bPos = Math.max(0.0, Math.min(last, bPos));
      line = 171;
    }

    const close = Math.abs(aPos - bPos) < 1.0;
    if (close && !wasClose) {
      const mid = (aPos + bPos) / 2;
      for (let n = 0; n < 8; n++) sparks.push([mid, random.uniform(-0.7, 0.7), 255.0]);
      line = 178;
    }
    wasClose = close;

    drawDot(px, aPos, hsv(hue));
    drawDot(px, bPos, hsv(hue + 128));

    for (const s of sparks) {
      s[0] += s[1];
      s[1] *= 0.92;
      s[2] *= 0.88;
      drawDot(px, s[0], [s[2], s[2] * 0.8, s[2] * 0.4]);
    }
    sparks = sparks.filter((s) => s[2] > 6 && s[0] >= 0 && s[0] < last);

    hue = (hue + 1) & 255;
    yield line;
  }
}

function* fire(px, random) {
  const cooling = Math.floor((55 * 10) / NUM_LEDS) + 2;
  const heat = new Array(NUM_LEDS).fill(0);
  while (true) {
    for (let i = 0; i < NUM_LEDS; i++) heat[i] = Math.max(0, heat[i] - random.randint(0, cooling));
    for (let k = NUM_LEDS - 1; k > 1; k--) heat[k] = Math.floor((heat[k - 1] + heat[k - 2] * 2) / 3);
    let line = 214;
    if (random.randint(0, 255) < 130) {
      const y = random.randint(0, 5);
      heat[y] = Math.min(255, heat[y] + random.randint(160, 255));
      line = 217;
    }
    for (let i = 0; i < NUM_LEDS; i++) px[i] = heatColour(heat[i]);
    yield line;
  }
}

const STAR_TINTS = [[0, 0], [0, 0], [150, 120], [35, 140], [200, 110]];

function* starfield(px, random) {
  const level = new Array(NUM_LEDS).fill(0);
  const state = new Array(NUM_LEDS).fill(0); // 0 = off, 1 = brightening, -1 = fading
  const tint = new Array(NUM_LEDS).fill(STAR_TINTS[0]); // [hue, saturation] of each star
  let t = 0;
  while (true) {
    let line = 245;
    for (let i = 0; i < NUM_LEDS; i++) {
      if (state[i] === 0 && random.randint(0, 299) === 0) {
        state[i] = 1;
        tint[i] = random.choice(STAR_TINTS);
        line = 233;
      } else if (state[i] === 1) {
        level[i] = Math.min(255, level[i] + 14);
        if (level[i] === 255) state[i] = -1;
      } else if (state[i] === -1) {
        level[i] = Math.max(0, level[i] - 4);
        if (level[i] === 0) state[i] = 0;
      }
      const bg = hsv(160 + (SIN8[(i * 12 + t) & 255] >> 3), 255, 45 + (SIN8[(i * 25 - t * 2) & 255] >> 4));
      const star = hsv(tint[i][0], tint[i][1], level[i]);
      px[i] = [Math.max(bg[0], star[0]), Math.max(bg[1], star[1]), Math.max(bg[2], star[2])];
    }
    t += 1;
    yield line;
  }
}

function* plasma(px) {
  let t = 0;
  while (true) {
    for (let i = 0; i < NUM_LEDS; i++) {
      const a = SIN8[(i * 16 + t * 2) & 255];
      const b = SIN8[(t * 3 - i * 11 + 64) & 255];
      const c = SIN8[(i * 7 - t + 128) & 255];
      px[i] = hsv(((a + b) >> 1) + t, 240, 120 + ((c * 135) >> 8));
    }
    t += 1;
    yield 262;
  }
}

function* heartbeat(px) {
  const period = 55;
  const env = [];
  for (let k = 0; k < period; k++) {
    const e = 255 * Math.exp(-(((k - 4) / 2.2) ** 2)) + 170 * Math.exp(-(((k - 14) / 2.8) ** 2));
    env.push(Math.min(255, int(e)));
  }
  const centre = (NUM_LEDS - 1) / 2;
  let t = 0;
  while (true) {
    for (let i = 0; i < NUM_LEDS; i++) {
      const d = Math.abs(i - centre);
      const v = Math.max(55, env[pyMod(t - int(d * 1.5), period)]);
      px[i] = hsv(int(250 - d * 3) & 255, 230, v);
    }
    t += 1;
    yield 280;
  }
}

// lines: the boot.py lines the code panel shows for each effect. restLine: the line highlighted between events
// (an event line, such as the comets crossing, holds the highlight for a moment; see highlight.js).
export const POWER_UP = { name: 'power_up', label: 'Power up', run: powerUp, lines: [106, 137], restLine: 113 };
export const EFFECTS = [
  { name: 'rainbow_glitter', label: 'Rainbow glitter', run: rainbowGlitter, lines: [140, 150], restLine: 146 },
  { name: 'twin_comets', label: 'Twin comets', run: twinComets, lines: [153, 192], restLine: 181 },
  { name: 'fire', label: 'Fire', run: fire, lines: [195, 220], restLine: 214 },
  { name: 'starfield', label: 'Starfield', run: starfield, lines: [223, 251], restLine: 245 },
  { name: 'plasma', label: 'Plasma', run: plasma, lines: [254, 264], restLine: 262 },
  { name: 'heartbeat', label: 'Heartbeat', run: heartbeat, lines: [267, 283], restLine: 280 },
];
