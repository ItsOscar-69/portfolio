# Portfolio Milestone 4 (Pico Light Show world) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Pico Light Show chapter its own world:
- a 3D strip of 20 glowing LEDs, with bloom;
- the LEDs run a frame-exact JavaScript port of Oscar's MicroPico `boot.py`;
- effect chips and play/pause sit over the strip;
- a live code panel highlights the `boot.py` line that is running.

**Architecture:**
- **The port.** It lives in `src/lib/led/` as pure modules:
  - the maths helpers;
  - one seeded random stream;
  - the seven effects as generators, like `boot.py`'s;
  - the `light_show()` timeline;
  - a player that turns wall-clock time into 50 fps frames.
- **Proof that the port is exact.** `tools/led-reference.py` runs the real `boot.py` under CPython with its hardware stubbed and the same seeded stream. The port must match the committed fixture frame for frame: 5,030 frames, which covers the intro, all six effects and the wrap back to the first.
- **One show, two drivers.** One player is shared by the page:
  - the `pico` world advances it while the 3D chapter is live;
  - the page's own loop advances it otherwise (reduced motion, no WebGL, or a failed world);
  - the player makes sure only one of them drives it at a time.
- **Bloom.** The stage gains bloom, which a world opts into. It uses three.js's `UnrealBloomPass` on a render target, and the low tier never blooms.

**Tech Stack:** Milestones 1–3's stack (Vite 6.4.1, three.js 0.181.0, Lenis 1.3.11, Vitest 3.2.4, Playwright 1.61.1 on Microsoft Edge, sharp 0.32.6). It adds no new dependencies. `UnrealBloomPass` ships inside three.js. Python 3 is used only to regenerate the reference fixture.

**Spec:** `docs/superpowers/specs/2026-11-16-portfolio-design.md`. §4.4 covers the Pico world, §6 the stage's bloom, §8 the quality bars (low tier has no bloom; reduced motion means demos run only on Play) and §9 the LED port's unit tests.

**Builds on:** `main` at `140a9ff` (milestones 1–3 merged). `CLAUDE.md` explains the current code.

**Proven before planning (17 Nov 2026, on this PC):**
- **The port matches.** The ported code in Tasks 1 and 2 matched the real `boot.py` exactly:
  - all 5,030 frames, as 101 block digests and 29 full checkpoint frames;
  - `SIN8`, `GAMMA` and 12 `hsv` reference values.
- **The reference run** printed `frames=5030 non_int=0 min=0 max=255 clock_ms=100580`, with no negative values for seed 1543.
- **Bloom works under SwiftShader.** In Edge with SwiftShader, `UnrealBloomPass.render(renderer, null, target)` blooms the target in place:
  - half-float targets are available and there are no GL errors;
  - a pixel 25 px from a small red sphere went from background (9, 9, 9) to (25, 12, 11).

**Deliberate readings of the spec (Oscar reviews these):**
- **Pre-gamma colours on screen.** The screen shows `boot.py`'s pixel values before gamma. `GAMMA` turns how bright a colour should look into the LED's raw drive level, and it tops out at 77. A screen already applies its own curve, so the pixel values are what your eye sees on the real strip. `GAMMA` is still ported and tested exactly, as §9 asks.
- **Reduced motion.** The 3D stage stays off under reduced motion, as milestone 1 built it. Play therefore runs the show on a small strip of 20 dots beside the code, not on the 3D strip.
- **"The line that is currently running."** Each frame reports the `boot.py` line it was about, for example the spark shower when the comets cross, or a new star. A highlight that changed 50 times a second would be unreadable, so event lines hold for 0.4 s and the effect's main line shows the rest of the time.
- **Chips.** `boot.py` has no buttons. Picking an effect crossfades from what's on screen into a fresh start of that effect, then autoplay carries on in order from there.
- **Code panel.** It shows the source of all seven effects (lines 106–283) and scrolls itself to the one that's playing, so without JavaScript it is still the full code.

## Global Constraints

- **Node:** must run on Node 18.16.0 (this PC) and Node 20 (CI).
- **No new dependencies.** Keep every pinned version exactly as it is.
  - Bloom comes from `three/addons/postprocessing/UnrealBloomPass.js`, which is part of three 0.181.0.
  - Python 3 is only for `npm run led:reference`. Tests and CI read the committed fixture and never need Python.
- **Playwright browser:** Playwright drives the installed Microsoft Edge (`channel: 'msedge'`) with SwiftShader WebGL. SwiftShader makes the page pick the low tier, so add `?tier=high` to test bloom.
- **The repo will be public.**
  - No file or commit message may contain Oscar's surname, school, state, assignment name or any email address. The only name shown is "Oscar".
  - `tests/unit/privacy.test.js` must keep passing.
- **Credit.** Oscar wrote the light show. Claude Code wrote only the first comet and the colour-overflow fix. Code comments call the JavaScript a port of Oscar's `boot.py` and never claim more. Don't change the project's copy, apart from the code-panel caption in Task 6.
- **Git identity:** commit with the existing global git identity. Never change git config.
- **No pushing:** do not push and do not create a remote. Publishing is milestone 6.
- **No third parties:** the built site makes no requests to third-party hosts.
- **Look:** the site is dark only. The LEDs show exactly the colours `boot.py` computes.
- **Reduced motion:** no 3D stage and nothing animates by itself. The light show runs only after the visitor presses Play (spec §8.2).
- **Base path and escaping:**
  - every URL written into HTML goes through `withBase()` with `BASE` from `site.config.js`;
  - every attribute value and text node goes through `escapeHtml()`.
- **Never commit:** `raw/`, `sources.local.json`, `privacy.local.json` or `screens/`.
- **Media:** published images are WebP with no EXIF, XMP or IPTC metadata. `npm test` enforces this.
- **Commit messages:** every one ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pass it as a second `-m`.
- **Working directory and branch:** all commands run from `C:\Users\Oscar\Downloads\portfolio` in Git Bash, on the branch `milestone-4-pico` (cut from `main` when execution starts).
- **Dev server and git:** stop any running dev server before switching branches, because Windows file locks block `git checkout`.

## Review Focus

1. **Fast chip taps:** a visitor taps chips quickly, including in the middle of a crossfade. Nothing jumps or flashes, and autoplay carries on in order after the picked effect. Task 2 tests this.
2. **Coming back after a long absence:** the tab was hidden, or the chapter scrolled away, for minutes. The show must not fast-forward through thousands of frames on return. `boot.py` itself says "running behind, don't try to catch up" (line 301). Task 3 tests this.
3. **Two drivers:** the 3D world and the page's own loop both try to drive the show. It must never run at double speed. Task 3 tests this.
4. **A re-copied `boot.py`:** someone copies `boot.py` again with its lines shifted. The code panel must not quietly highlight the wrong lines. Task 2 pins every line number to its text.
5. **Reduced motion:** nothing animates until the visitor presses Play. Then the show runs without the 3D stage, on the small dot strip and in the code panel. Task 6 tests this.

---

## File Structure

```
tools/led-reference.py              NEW  runs the real boot.py under CPython and records every frame it shows
tests/fixtures/boot-reference.json  NEW  (generated, committed) tables, hsv values, frame digests, checkpoints
src/lib/led/maths.js                NEW  boot.py's constants, GAMMA, SIN8, hsv, fade_all, add, draw_dot, heat_colour
src/lib/led/random.js               NEW  boot.py's randint/uniform/choice over one seeded mulberry32 stream
src/lib/led/effects.js              NEW  the seven effects as generators that yield the boot.py line they drew
src/lib/led/show.js                 NEW  light_show(): intro, 50-frame crossfades, 15 s per effect; select()
src/lib/led/player.js               NEW  time → 50 fps frames, play/pause/select, one driver at a time; sharedPlayer()
src/lib/led/highlight.js            NEW  which boot.py line the code panel shows (event lines hold 0.4 s)
src/lib/tier.js                     MOD  TIER_SETTINGS[tier].bloom; bloomFor(tier, request)
src/stage/bloom.js                  NEW  UnrealBloomPass on a render target, created on first use
src/stage/transition.js             MOD  a post hook for each world's render target; single() for one blooming world
src/stage/stage.js                  MOD  blooms worlds that ask for it (world.bloom), when the tier allows
src/worlds/pico.js                  NEW  20 instanced LED spheres + halos on a gentle curve, lit by the shared player
src/worlds/names.js                 MOD  + 'pico'
src/content/render.js               MOD  code blocks: one span per line with its line number; data-live
src/content/validate.js             MOD  "live" is a boolean, for code media only
src/content/projects.js             MOD  Pico: world 'pico'; live code panel over lines 106–283
src/ui/light-show.js                NEW  chips + play/pause, the 20-dot strip, the code highlight, the page's loop
src/app.js                          MOD  starts the light-show controls
src/styles/chapter.css              MOD  chips, dot strip, highlighted code line
package.json                        MOD  + "led:reference"
public/posters/pico-light-show.webp REGENERATED
tests/unit/led-maths.test.js        NEW
tests/unit/led-show.test.js         NEW
tests/unit/led-player.test.js       NEW
tests/unit/tier.test.js             MOD
tests/unit/render.test.js           MOD
tests/unit/validate.test.js         MOD
tests/e2e/pico-world.spec.js        NEW
tests/e2e/pico-ui.spec.js           NEW
CLAUDE.md                           MOD  world interface `bloom`, the LED port, status, commands
```

---

### Task 1: The reference run and the LED maths

**Files:**
- Create: `tools/led-reference.py`, `tests/fixtures/boot-reference.json` (generated), `src/lib/led/maths.js`, `src/lib/led/random.js`, `tests/unit/led-maths.test.js`
- Modify: `package.json` (add the `led:reference` script)

**Interfaces:**
- Consumes: `mulberry32(seed)` from `src/lib/rng.js` (M1), which returns `next()` giving a float in [0, 1). `public/projects/pico-light-show/boot.py` (M1) is Oscar's real file, 352 lines.
- Produces:
  - **`maths.js`:**
    - constants: `NUM_LEDS` (20), `BRIGHTNESS` (0.3), `EFFECT_SECONDS` (15), `FADE_FRAMES` (50), `FRAME_MS` (20), `FPS` (50);
    - Python helpers: `int(x)` (truncates toward zero) and `pyMod(a, n)` (never negative);
    - tables: `GAMMA` and `SIN8`, each `number[256]`;
    - colour and pixel functions, where pixels are mutable `[r, g, b][]`: `hsv(h, s = 255, v = 255) → [r, g, b]`, `fadeAll(px, keep)`, `add(px, i, colour, k = 1)`, `drawDot(px, pos, colour)` and `heatColour(heat) → [r, g, b]`.
  - **`random.js`:** `createRandom(seed)` returns `{ randint(a, b), uniform(a, b), choice(list) }`, all drawn from one stream.
  - **The fixture** `tests/fixtures/boot-reference.json` holds `{ source, seed: 1543, frames: 5030, blockSize: 50, blocks: string[101], checkpoints: { [frame]: [r, g, b][] }, sin8, gamma, hsv: { "h,s,v": [r, g, b] } }`.

- [ ] **Step 1: Write the reference tool**

`tools/led-reference.py`:
```python
"""Runs the real MicroPico boot.py under CPython with the hardware stubbed out, and records every frame it shows.

Usage: python tools/led-reference.py <path to boot.py> <seed> <frames> <out.json>   (or: npm run led:reference)
random is replaced by a mulberry32 stream defined exactly like src/lib/rng.js and src/lib/led/random.js, so the
JavaScript port fed the same seed must produce identical frames. The tests read the committed output; only
regenerating it needs Python.
"""
import hashlib
import json
import sys
import types

boot_path, seed, frame_count, out_path = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]


def mulberry32(seed):
    state = [seed & 0xFFFFFFFF]

    def imul(x, y):
        return (x * y) & 0xFFFFFFFF

    def nxt():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        a = state[0]
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return nxt


draw = mulberry32(seed)
fake_random = types.ModuleType('random')
fake_random.randint = lambda a, b: a + int(draw() * (b - a + 1))
fake_random.uniform = lambda a, b: a + (b - a) * draw()
fake_random.choice = lambda seq: seq[int(draw() * len(seq))]

clock = [0]
fake_time = types.ModuleType('time')
fake_time.ticks_ms = lambda: clock[0]
fake_time.ticks_add = lambda a, b: a + b
fake_time.ticks_diff = lambda a, b: a - b


def sleep_ms(ms):
    clock[0] += ms


fake_time.sleep_ms = sleep_ms

machine = types.ModuleType('machine')
machine.Pin = lambda *args, **kwargs: None
rp2 = types.ModuleType('rp2')
rp2.PIO = types.SimpleNamespace(OUT_LOW=0, SHIFT_LEFT=0)
rp2.asm_pio = lambda **kwargs: (lambda fn: fn)


class StateMachine:
    def __init__(self, *args, **kwargs):
        pass

    def active(self, on):
        pass

    def put(self, words, shift):
        pass


rp2.StateMachine = StateMachine
sys.modules.update({'random': fake_random, 'time': fake_time, 'machine': machine, 'rp2': rp2})

# Run everything in boot.py except its final `try: light_show()`, then call light_show() with show() swapped for
# a recorder. Every line that draws a frame is boot.py's own.
source = open(boot_path, encoding='utf8').read()
cut = source.index('\ntry:\n    light_show()')
g = {'__name__': 'boot'}
exec(compile(source[:cut], 'boot.py', 'exec'), g)


class Done(Exception):
    pass


frames = []


def capture(px):
    frames.append([list(c) for c in px])
    if len(frames) >= frame_count:
        raise Done()


g['show'] = capture
try:
    g['light_show']()
except Done:
    pass

values = [v for f in frames for c in f for v in c]
non_int = sum(1 for v in values if not isinstance(v, int))
encode = lambda block: '\n'.join(';'.join(','.join(str(v) for v in c) for c in f) for f in block)
BLOCK = 50
blocks = [hashlib.sha256(encode(frames[i:i + BLOCK]).encode()).hexdigest()[:16] for i in range(0, len(frames), BLOCK)]
checkpoints = {str(i): frames[i] for i in (0, 27, 28, 40, 72, 129, 130, 155, 179, 180, 500, 929, 930, 1000, 1729, 1730, 1800, 2529, 2530, 2600, 3329, 3330, 3400, 4129, 4130, 4200, 4929, 4930, 5000)
               if i < len(frames)}
out = {
    'source': 'MicroPico/boot.py run under CPython by tools/led-reference.py',
    'seed': seed,
    'frames': len(frames),
    'blockSize': BLOCK,
    'blocks': blocks,
    'checkpoints': checkpoints,
    'sin8': list(g['SIN8']),
    'gamma': list(g['GAMMA']),
    'hsv': {f'{h},{s},{v}': list(g['hsv'](h, s, v)) for h, s, v in [(0, 255, 255), (42, 255, 255), (43, 255, 255), (85, 255, 255), (128, 255, 255), (170, 200, 180), (213, 255, 100), (255, 255, 255), (300, 255, 255), (-1, 255, 255), (10, 0, 77), (160, 255, 45)]},
}
json.dump(out, open(out_path, 'w'), separators=(',', ':'))
print(f'frames={len(frames)} non_int={non_int} min={min(values)} max={max(values)} clock_ms={clock[0]}')
print(f'negative values: {sum(1 for v in values if v < 0)}')
```

In `package.json` `"scripts"`, add:
```json
"led:reference": "python tools/led-reference.py public/projects/pico-light-show/boot.py 1543 5030 tests/fixtures/boot-reference.json",
```

Run: `mkdir -p tests/fixtures && npm run led:reference`
Expected:
```
frames=5030 non_int=0 min=0 max=255 clock_ms=100580
negative values: 0
```
`tests/fixtures/boot-reference.json` should be about 10 KB.

- [ ] **Step 2: Write the failing maths tests**

`tests/unit/led-maths.test.js`:
```js
import { it, expect } from 'vitest';
import fs from 'node:fs';
import { GAMMA, SIN8, NUM_LEDS, FPS, hsv, fadeAll, add, drawDot, heatColour, int, pyMod } from '../../src/lib/led/maths.js';
import { createRandom } from '../../src/lib/led/random.js';

const ref = JSON.parse(fs.readFileSync('tests/fixtures/boot-reference.json', 'utf8'));
const strip = (c = [0, 0, 0]) => Array.from({ length: NUM_LEDS }, () => c.slice());

it('builds exactly the gamma and sine tables boot.py builds', () => {
  expect(GAMMA).toEqual(ref.gamma);
  expect(SIN8).toEqual(ref.sin8);
  expect([GAMMA[0], GAMMA[1], GAMMA[128], GAMMA[255]]).toEqual([0, 1, 19, 77]);
  expect([NUM_LEDS, FPS]).toEqual([20, 50]);
});

it('converts hsv exactly like boot.py, including hues past 255 and below 0', () => {
  for (const [key, want] of Object.entries(ref.hsv)) {
    const [h, s, v] = key.split(',').map(Number);
    expect(hsv(h, s, v), `hsv(${key})`).toEqual(want);
  }
});

it('truncates and wraps numbers the way Python does', () => {
  expect(int(1.9)).toBe(1);
  expect(int(-1.5)).toBe(-1);
  expect(pyMod(-3, 55)).toBe(52);
  expect(pyMod(57, 55)).toBe(2);
});

it('fades, adds with a 255 ceiling, and ignores LEDs off the strip', () => {
  const px = strip([200, 100, 10]);
  fadeAll(px, 128);
  expect(px[0]).toEqual([100, 50, 5]);
  add(px, 0, [200, 10, 0]);
  expect(px[0]).toEqual([255, 60, 5]);
  add(px, -1, [9, 9, 9]);
  add(px, NUM_LEDS, [9, 9, 9]);
  expect(px.slice(1)).toEqual(strip([100, 50, 5]).slice(1));
});

it('splits a dot between its two nearest LEDs', () => {
  const px = strip();
  drawDot(px, 2.25, [100, 200, 40]);
  expect(px[2]).toEqual([75, 150, 30]);
  expect(px[3]).toEqual([25, 50, 10]);
});

it('keeps boot.py’s behaviour just before the strip’s first LED, where a dot adds a negative amount', () => {
  const px = strip([10, 10, 10]);
  drawDot(px, -0.5, [100, 100, 100]);
  expect(px[0]).toEqual([160, 160, 160]);
  expect(px[1]).toEqual([-40, -40, -40]);
});

it('maps heat to black, red, orange, yellow and white', () => {
  expect(heatColour(0)).toEqual([0, 0, 0]);
  expect(heatColour(80)).toEqual([236, 0, 0]);
  expect(heatColour(130)).toEqual([255, 128, 0]);
  expect(heatColour(255)).toEqual([255, 255, 248]);
});

it('draws repeatable random numbers in boot.py’s ranges', () => {
  const a = createRandom(5);
  const b = createRandom(5);
  const draws = Array.from({ length: 2000 }, () => a.randint(0, 5));
  expect(draws).toEqual(Array.from({ length: 2000 }, () => b.randint(0, 5)));
  expect([Math.min(...draws), Math.max(...draws)]).toEqual([0, 5]);
  const spread = Array.from({ length: 500 }, () => a.uniform(-0.7, 0.7));
  expect(Math.min(...spread)).toBeGreaterThanOrEqual(-0.7);
  expect(Math.max(...spread)).toBeLessThan(0.7);
  expect(['x', 'y', 'z']).toContain(a.choice(['x', 'y', 'z']));
});
```

Run: `npx vitest run tests/unit/led-maths.test.js`
Expected: FAIL, because `src/lib/led/maths.js` doesn't exist yet.

- [ ] **Step 3: Implement `src/lib/led/maths.js` and `src/lib/led/random.js`**

`src/lib/led/maths.js`:
```js
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
```

`src/lib/led/random.js`:
```js
import { mulberry32 } from '../rng.js';

// boot.py's three random calls, drawn from one seeded stream (like Python's single global random) so a run can be
// replayed exactly. tools/led-reference.py gives the real boot.py the same stream, defined the same way.
export function createRandom(seed) {
  const next = mulberry32(seed);
  return {
    randint: (a, b) => a + Math.floor(next() * (b - a + 1)),
    uniform: (a, b) => a + (b - a) * next(),
    choice: (list) => list[Math.floor(next() * list.length)],
  };
}
```

Run: `npx vitest run tests/unit/led-maths.test.js`
Expected: PASS (8 tests).

- [ ] **Step 4: Run the whole unit suite**

Run: `npm test`
Expected: all PASS. The privacy test also scans the new files.

- [ ] **Step 5: Commit**

```bash
git add tools/led-reference.py tests/fixtures/boot-reference.json src/lib/led/maths.js src/lib/led/random.js tests/unit/led-maths.test.js package.json
git commit -m "feat: port boot.py's LED maths and record the real boot.py's frames as a test fixture" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The seven effects and the light-show timeline

**Files:**
- Create: `src/lib/led/effects.js`, `src/lib/led/show.js`, `tests/unit/led-show.test.js`

**Interfaces:**
- Consumes (from Task 1):
  - `NUM_LEDS`, `SIN8`, `int`, `pyMod`, `hsv`, `fadeAll`, `drawDot`, `heatColour`, `EFFECT_SECONDS`, `FADE_FRAMES` and `FRAME_MS` from `maths.js`;
  - `createRandom` from `random.js`;
  - the fixture.
- Produces:
  - **`effects.js`:**
    - `POWER_UP` is an effect descriptor: `{ name: 'power_up', label: 'Power up', run, lines: [106, 137], restLine: 113 }`;
    - `EFFECTS` is 6 descriptors, in boot.py's order: `rainbow_glitter`, `twin_comets`, `fire`, `starfield`, `plasma`, `heartbeat`;
    - each descriptor's `run(px, random)` is a generator that draws one frame into `px` and yields the boot.py line number it drew;
    - `lines` is `[first, last]`, the boot.py lines the code panel shows for that effect;
    - `restLine` is the line highlighted between events.
  - **`show.js`:**
    - `INTRO_FRAMES` (130) and `PLAY_FRAMES` (750);
    - `createShow({ seed = 1543 })` returns `{ step() → State, state() → State, select(index) }`;
    - `State` is `{ frame, colours: [r, g, b][], effect: string, line: number, phase: 'intro' | 'fade' | 'play' }`;
    - each `step()` replaces `colours` with a new array and never mutates an old one, so stored states stay valid;
    - during a crossfade, `effect` and `line` belong to the effect fading in.

- [ ] **Step 1: Write the failing tests**

`tests/unit/led-show.test.js`:
```js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createShow, INTRO_FRAMES, PLAY_FRAMES } from '../../src/lib/led/show.js';
import { EFFECTS, POWER_UP } from '../../src/lib/led/effects.js';
import { FADE_FRAMES, NUM_LEDS } from '../../src/lib/led/maths.js';

const ref = JSON.parse(fs.readFileSync('tests/fixtures/boot-reference.json', 'utf8'));
const run = (show, n) => Array.from({ length: n }, () => show.step());
const encode = (frames) => frames.map((f) => f.map((c) => c.join(',')).join(';')).join('\n');

describe('the light-show port', () => {
  const states = run(createShow({ seed: ref.seed }), ref.frames);

  it('shows exactly the frames the real boot.py shows: the intro, all six effects and back to the first', () => {
    ref.blocks.forEach((want, b) => {
      const block = states.slice(b * ref.blockSize, (b + 1) * ref.blockSize).map((s) => s.colours);
      const got = crypto.createHash('sha256').update(encode(block)).digest('hex').slice(0, 16);
      expect(got, `frames ${b * ref.blockSize}–${(b + 1) * ref.blockSize - 1}`).toBe(want);
    });
    for (const [i, want] of Object.entries(ref.checkpoints)) expect(states[Number(i)].colours, `frame ${i}`).toEqual(want);
  });

  it('plays power_up for 2.6 s, then crossfades over 50 frames into each effect in order and plays it for 15 s', () => {
    expect([INTRO_FRAMES, FADE_FRAMES, PLAY_FRAMES]).toEqual([130, 50, 750]);
    expect(states.slice(0, 130).every((s) => s.phase === 'intro' && s.effect === 'power_up')).toBe(true);
    EFFECTS.forEach((effect, e) => {
      const fadeStart = INTRO_FRAMES + e * (FADE_FRAMES + PLAY_FRAMES);
      const fading = states.slice(fadeStart, fadeStart + FADE_FRAMES);
      const playing = states.slice(fadeStart + FADE_FRAMES, fadeStart + FADE_FRAMES + PLAY_FRAMES);
      expect(fading.every((s) => s.phase === 'fade' && s.effect === effect.name), `fade into ${effect.name}`).toBe(true);
      expect(playing.every((s) => s.phase === 'play' && s.effect === effect.name), `play ${effect.name}`).toBe(true);
    });
    expect(states[4930]).toMatchObject({ phase: 'fade', effect: 'rainbow_glitter' });
  });

  it('only reports lines inside the effect that is playing', () => {
    const byName = Object.fromEntries([POWER_UP, ...EFFECTS].map((e) => [e.name, e]));
    for (const s of states) {
      const [first, last] = byName[s.effect].lines;
      expect(s.line >= first && s.line <= last, `${s.effect} line ${s.line} at frame ${s.frame}`).toBe(true);
    }
  });
});

describe('twin_comets', () => {
  it('bounces off both ends and throws 8 sparks every time the comets cross', () => {
    const px = Array.from({ length: NUM_LEDS }, () => [0, 0, 0]);
    let sparks = 0;
    const gen = EFFECTS[1].run(px, { uniform: () => { sparks += 1; return 0.3; } });
    const lines = Array.from({ length: 800 }, () => gen.next().value);
    const crossings = lines.filter((l) => l === 178).length;
    expect(crossings).toBeGreaterThan(5);
    expect(sparks).toBe(8 * crossings);
    expect(lines).toContain(168);
    expect(lines).toContain(171);
  });
});

describe('picking an effect', () => {
  it('crossfades into a fresh start of it, plays it for 15 s, then carries on in order', () => {
    const show = createShow({ seed: 7 });
    run(show, 300);
    show.select(2);
    const after = run(show, FADE_FRAMES + PLAY_FRAMES + 1);
    expect(after.slice(0, FADE_FRAMES).every((s) => s.phase === 'fade' && s.effect === 'fire')).toBe(true);
    expect(after.slice(FADE_FRAMES, FADE_FRAMES + PLAY_FRAMES).every((s) => s.phase === 'play' && s.effect === 'fire')).toBe(true);
    expect(after[FADE_FRAMES + PLAY_FRAMES]).toMatchObject({ phase: 'fade', effect: 'starfield' });
  });

  it('picking again mid-crossfade starts from the half-blended frame, so nothing jumps', () => {
    const show = createShow({ seed: 7 });
    run(show, 300);
    show.select(2);
    run(show, 25);
    const before = show.state().colours;
    show.select(4);
    const first = show.step();
    expect(first).toMatchObject({ phase: 'fade', effect: 'plasma' });
    const jump = Math.max(...before.flatMap((c, i) => c.map((v, ch) => Math.abs(v - first.colours[i][ch]))));
    expect(jump).toBeLessThanOrEqual(6); // one 1/50 step of a crossfade
  });
});

describe('the boot.py lines the code panel highlights', () => {
  const source = fs.readFileSync('public/projects/pico-light-show/boot.py', 'utf8').split(/\r?\n/);
  const at = (n) => source[n - 1];

  it('point at the statements they describe', () => {
    const expected = {
      113: 'draw_dot(px, pos,', 121: 'px[i] = (v, v, v)', 128: 'px[i] = hsv(int(d * 256', 137: 'yield',
      146: 'px[i] = hsv(t * 2', 148: 'px[random.randint', 168: 'a_vel = -a_vel', 171: 'b_vel = -b_vel',
      178: 'sparks.append', 181: 'draw_dot(px, a_pos', 214: 'heat[k] = (heat[k - 1]', 217: 'heat[y] = min(255',
      233: 'state[i] = 1', 245: 'bg = hsv(', 262: 'px[i] = hsv(((a + b)', 280: 'v = max(55, env[',
    };
    for (const [n, text] of Object.entries(expected)) expect(at(Number(n)), `boot.py line ${n}`).toContain(text);
  });

  it('frame each effect’s own def', () => {
    for (const effect of [POWER_UP, ...EFFECTS]) {
      const [first, last] = effect.lines;
      expect(at(first), effect.name).toMatch(/^def /);
      expect(source.slice(first - 1, last).some((l) => l.startsWith(`def ${effect.name}(`)), effect.name).toBe(true);
      expect(effect.restLine >= first && effect.restLine <= last, effect.name).toBe(true);
    }
  });
});
```

Run: `npx vitest run tests/unit/led-show.test.js`
Expected: FAIL, because `src/lib/led/show.js` doesn't exist yet.

- [ ] **Step 2: Implement `src/lib/led/effects.js`**

```js
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
```

- [ ] **Step 3: Implement `src/lib/led/show.js`**

```js
import { NUM_LEDS, EFFECT_SECONDS, FADE_FRAMES, FRAME_MS, int } from './maths.js';
import { createRandom } from './random.js';
import { POWER_UP, EFFECTS } from './effects.js';

// boot.py's light_show() (lines 304-346) as a frame-by-frame state machine: power_up plays for 2600 ms, then each
// effect crossfades in over 50 frames and plays for 15 s, in order, forever. step() is one 20 ms frame.
export const INTRO_FRAMES = 2600 / FRAME_MS; // 130
export const PLAY_FRAMES = (EFFECT_SECONDS * 1000) / FRAME_MS; // 750

const black = () => Array.from({ length: NUM_LEDS }, () => [0, 0, 0]);
const copy = (px) => px.map((c) => c.slice());

export function createShow({ seed = 1543 } = {}) {
  const random = createRandom(seed);
  const start = (effect) => {
    const px = black();
    return { effect, px, gen: effect.run(px, random), line: effect.restLine };
  };

  let current = start(POWER_UP);
  let incoming = null; // the effect fading in, during a crossfade
  let fadeFrame = 0;
  let playLeft = INTRO_FRAMES;
  let next = 0; // the EFFECTS index autoplay starts next
  let frame = 0;
  let phase = 'intro';
  let shown = black();

  const state = () => {
    const on = incoming || current;
    return { frame, colours: shown, effect: on.effect.name, line: on.line, phase };
  };
  const beginFade = (effect) => {
    incoming = start(effect);
    fadeFrame = 0;
  };

  return {
    state,
    // One frame of boot.py's play() or crossfade().
    step() {
      if (!incoming && playLeft === 0) {
        beginFade(EFFECTS[next]);
        next = (next + 1) % EFFECTS.length;
      }
      frame += 1;
      if (incoming) {
        if (current.gen) current.line = current.gen.next().value; // 320: next(gen)
        incoming.line = incoming.gen.next().value; // 321: next(new_gen)
        fadeFrame += 1;
        const t = fadeFrame / FADE_FRAMES;
        shown = current.px.map((a, i) => {
          const b = incoming.px[i];
          return [int(a[0] + (b[0] - a[0]) * t), int(a[1] + (b[1] - a[1]) * t), int(a[2] + (b[2] - a[2]) * t)];
        });
        phase = 'fade';
        if (fadeFrame === FADE_FRAMES) {
          current = incoming;
          incoming = null;
          playLeft = PLAY_FRAMES;
        }
      } else {
        current.line = current.gen.next().value;
        shown = copy(current.px);
        phase = current.effect === POWER_UP ? 'intro' : 'play';
        playLeft -= 1;
      }
      return state();
    },
    // A visitor picked an effect. Crossfade from whatever is on screen into a fresh start of it, then carry on in
    // order from there. (Not in boot.py, which has no buttons.)
    select(index) {
      if (incoming) current = { effect: incoming.effect, px: copy(shown), gen: null, line: incoming.line }; // freeze the half-blended frame
      beginFade(EFFECTS[index]);
      next = (index + 1) % EFFECTS.length;
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/led-show.test.js`
Expected: PASS (7 tests). If the reference test fails, its message names the first 50-frame block that differs. Compare that block's frames with `boot.py` line by line. Never edit the fixture to make it pass.

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/led/effects.js src/lib/led/show.js tests/unit/led-show.test.js
git commit -m "feat: port boot.py's seven effects and its light-show timeline, frame-exact against the real boot.py" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The player and the code highlight

**Files:**
- Create: `src/lib/led/player.js`, `src/lib/led/highlight.js`, `tests/unit/led-player.test.js`

**Interfaces:**
- Consumes: `FPS` (from `maths.js`, Task 1) and `createShow` (from `show.js`, Task 2).
- Produces:
  - **`player.js`:**
    - `createPlayer({ seed = 1543 })` returns `{ state, playing, advance(seconds, source = 'page') → State, select(index), play(), pause(), subscribe(fn) → unsubscribe }`.
    - `state` is the latest `State` from Task 2. Before the first frame it is `{ frame: 0, colours: all black, effect: 'power_up', line: 113, phase: 'intro' }`.
    - `source` is `'world'` (the 3D world's `update`) or `'page'` (the page's own loop). A `'page'` call is ignored whenever the world has advanced since the previous `'page'` call.
    - `advance` runs at most 5 frames per call.
    - `subscribe(fn)` calls `fn(state)` after every `advance` that ran a frame, and after `select`, `play` and `pause`.
    - `sharedPlayer()` returns the page's one player, created on first use.
  - **`highlight.js`:** `HOLD_MS` (400) and `createHighlighter(holdMs = HOLD_MS)`, which returns `pick(line, restLine, now) → the line to highlight`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/led-player.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { createPlayer, sharedPlayer } from '../../src/lib/led/player.js';
import { createHighlighter, HOLD_MS } from '../../src/lib/led/highlight.js';

describe('the light-show player', () => {
  it('starts dark at power_up and runs 50 frames per second of time', () => {
    const p = createPlayer();
    expect(p.state).toMatchObject({ frame: 0, effect: 'power_up', phase: 'intro' });
    expect(p.state.colours.every((c) => c.join() === '0,0,0')).toBe(true);
    for (let i = 0; i < 10; i++) p.advance(0.1, 'world');
    expect(p.state.frame).toBe(50);
  });

  it('never catches up more than 5 frames at once, like boot.py’s frame timer', () => {
    const p = createPlayer();
    p.advance(600, 'world'); // ten minutes away
    expect(p.state.frame).toBe(5);
  });

  it('runs at single speed when the 3D world and the page both drive it, in either order', () => {
    const worldFirst = createPlayer();
    for (let i = 0; i < 20; i++) { worldFirst.advance(0.1, 'world'); worldFirst.advance(0.1, 'page'); }
    expect(worldFirst.state.frame).toBe(100);
    const pageFirst = createPlayer();
    for (let i = 0; i < 20; i++) { pageFirst.advance(0.1, 'page'); pageFirst.advance(0.1, 'world'); }
    expect(pageFirst.state.frame).toBe(105); // only the very first page call runs before the world is seen
  });

  it('lets the page drive when no world is running', () => {
    const p = createPlayer();
    for (let i = 0; i < 10; i++) p.advance(0.1, 'page');
    expect(p.state.frame).toBe(50);
  });

  it('stops while paused and picks up where it was', () => {
    const p = createPlayer();
    p.advance(0.1, 'world');
    p.pause();
    p.advance(0.1, 'world');
    expect([p.state.frame, p.playing]).toEqual([5, false]);
    p.play();
    p.advance(0.1, 'world');
    expect(p.state.frame).toBe(10);
  });

  it('plays a picked effect, even when paused', () => {
    const p = createPlayer();
    p.pause();
    p.select(3);
    expect(p.playing).toBe(true);
    p.advance(0.1, 'world');
    expect(p.state).toMatchObject({ phase: 'fade', effect: 'starfield' });
  });

  it('tells subscribers about new frames until they unsubscribe', () => {
    const p = createPlayer();
    const seen = [];
    const stop = p.subscribe((s) => seen.push(s.frame));
    p.advance(0.1, 'world');
    p.advance(0.001, 'world'); // not a whole frame yet: no news
    stop();
    p.advance(0.1, 'world');
    expect(seen).toEqual([5]);
  });

  it('shares one player across the page', () => {
    expect(sharedPlayer()).toBe(sharedPlayer());
  });
});

describe('the code highlight', () => {
  it('shows the rest line, and holds an event line for HOLD_MS', () => {
    const pick = createHighlighter();
    expect(pick(181, 181, 0)).toBe(181);
    expect(pick(178, 181, 100)).toBe(178);
    expect(pick(181, 181, 100 + HOLD_MS - 1)).toBe(178);
    expect(pick(181, 181, 100 + HOLD_MS)).toBe(181);
  });

  it('keeps holding while the event repeats', () => {
    const pick = createHighlighter();
    pick(217, 214, 0);
    pick(217, 214, 300);
    expect(pick(214, 214, 300 + HOLD_MS - 1)).toBe(217);
  });

  it('drops a held line as soon as the effect changes', () => {
    const pick = createHighlighter();
    pick(178, 181, 0);
    expect(pick(262, 262, 10)).toBe(262);
  });
});
```

Run: `npx vitest run tests/unit/led-player.test.js`
Expected: FAIL, because `src/lib/led/player.js` doesn't exist yet.

- [ ] **Step 2: Implement `src/lib/led/player.js` and `src/lib/led/highlight.js`**

`src/lib/led/player.js`:
```js
import { FPS } from './maths.js';
import { createShow } from './show.js';

// Like boot.py's wait_frame() (line 301): when running behind, don't try to catch up.
const MAX_FRAMES_PER_TICK = 5;

// Turns wall-clock time into the show's 50 fps frames. Two things may drive it: the pico world's update() while the
// 3D chapter is live ('world'), and the page's own loop otherwise ('page'), e.g. under reduced motion or without
// WebGL. A page tick is skipped whenever the world has ticked since the last page tick, so the show never runs at
// double speed.
export function createPlayer({ seed = 1543 } = {}) {
  const show = createShow({ seed });
  const listeners = new Set();
  let carry = 0;
  let worldTicks = 0;
  let worldTicksSeenByPage = 0;

  const player = {
    state: show.state(),
    playing: true,
    advance(seconds, source = 'page') {
      if (source === 'world') worldTicks += 1;
      else {
        const worldRan = worldTicks !== worldTicksSeenByPage;
        worldTicksSeenByPage = worldTicks;
        if (worldRan) return player.state;
      }
      if (!player.playing) return player.state;
      carry += seconds * FPS;
      const due = Math.floor(carry);
      carry -= due;
      const frames = Math.min(due, MAX_FRAMES_PER_TICK);
      for (let i = 0; i < frames; i++) player.state = show.step();
      if (frames) notify();
      return player.state;
    },
    select(index) {
      show.select(index);
      player.playing = true;
      notify();
    },
    play() {
      player.playing = true;
      notify();
    },
    pause() {
      player.playing = false;
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  const notify = () => listeners.forEach((fn) => fn(player.state));
  return player;
}

let shared = null;
// The page's one light show: the pico world and the page's controls both use it.
export function sharedPlayer() {
  if (!shared) shared = createPlayer();
  return shared;
}
```

`src/lib/led/highlight.js`:
```js
// Which boot.py line the code panel highlights. Most frames report their effect's rest line. An event line (the
// comets crossing, a burst of glitter, a new star, a new spark in the fire) holds the highlight for HOLD_MS, so it
// stays long enough to read at 50 frames a second.
export const HOLD_MS = 400;

export function createHighlighter(holdMs = HOLD_MS) {
  let shown = null;
  let rest = null;
  let since = -Infinity;
  return function pick(line, restLine, now) {
    if (restLine !== rest) {
      rest = restLine; // a new effect: forget the last one's event line
      shown = restLine;
      since = -Infinity;
    }
    if (line !== restLine) {
      shown = line;
      since = now;
    } else if (now - since >= holdMs) shown = restLine;
    return shown;
  };
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run tests/unit/led-player.test.js`
Expected: PASS (11 tests).

Run: `npm test`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/led/player.js src/lib/led/highlight.js tests/unit/led-player.test.js
git commit -m "feat: add the light-show player (50 fps, one driver, no catch-up) and the code-line highlight" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<!-- PART 2: Tasks 4-8 -->
