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
Expected: PASS (8 tests). If the reference test fails, its message names the first 50-frame block that differs. Compare that block's frames with `boot.py` line by line. Never edit the fixture to make it pass.

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

### Task 4: Bloom in the stage, for worlds that ask for it

**Files:**
- Create: `src/stage/bloom.js`
- Modify: `src/lib/tier.js`, `src/stage/transition.js`, `src/stage/stage.js`, `tests/unit/tier.test.js`

**Interfaces:**
- Consumes:
  - `TIER_SETTINGS` and `pickTier` (M1, `src/lib/tier.js`);
  - `createCompositor(renderer)` (M1, `src/stage/transition.js`), which returns `{ resize, render(from, to, t), dispose }`;
  - `stage.frame` (M1), which today renders the active world straight to the screen, or blends two through the compositor.
- Produces:
  - World interface addition: an optional `bloom: { strength, radius, threshold }` on the object `create` returns.
  - `TIER_SETTINGS[tier].bloom` (`high: true, mid: true, low: false`).
  - `bloomFor(tier, request)` returns `request` or `null`.
  - `createBloom()` returns `{ resize(w, h), apply(renderer, target, settings), dispose() }`.
  - The compositor gains `render(from, to, t, post)` and `single(world, post)`, where `post(world, target)` runs on each world's render target.
  - Worlds without `bloom` render exactly as before, straight to the screen.

- [ ] **Step 1: Write the failing tier test**

In `tests/unit/tier.test.js`, change the import line to:
```js
import { pickTier, particleCount, TIER_SETTINGS, bloomFor } from '../../src/lib/tier.js';
```
and append:
```js
it('blooms on the high and mid tiers, never on low (spec §8.1)', () => {
  const ask = { strength: 1, radius: 0.5, threshold: 0.1 };
  expect(bloomFor('high', ask)).toBe(ask);
  expect(bloomFor('mid', ask)).toBe(ask);
  expect(bloomFor('low', ask)).toBeNull();
  expect(bloomFor('high', undefined)).toBeNull();
  expect([TIER_SETTINGS.high.bloom, TIER_SETTINGS.mid.bloom, TIER_SETTINGS.low.bloom]).toEqual([true, true, false]);
});
```

Run: `npx vitest run tests/unit/tier.test.js`
Expected: FAIL, because `bloomFor` is not exported.

- [ ] **Step 2: Add the tier setting**

In `src/lib/tier.js`, replace the `TIER_SETTINGS` block with:
```js
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
```

Run: `npx vitest run tests/unit/tier.test.js`
Expected: PASS.

- [ ] **Step 3: Write `src/stage/bloom.js`**

```js
import { Vector2 } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Glow for worlds that ask for it. It blooms a render target in place: when it isn't rendering to the screen,
// UnrealBloomPass blends its result back onto the target it read. The pass and its half-float targets are made on
// first use, so a visit that never reaches a blooming world never pays for them.
export function createBloom() {
  let pass = null;
  let width = 1;
  let height = 1;
  return {
    resize(w, h) {
      width = w;
      height = h;
      if (pass) pass.setSize(w, h);
    },
    apply(renderer, target, { strength = 1, radius = 0.5, threshold = 0 } = {}) {
      if (!pass) pass = new UnrealBloomPass(new Vector2(width, height), strength, radius, threshold);
      pass.strength = strength;
      pass.radius = radius;
      pass.threshold = threshold;
      pass.render(renderer, null, target, 0, false);
    },
    dispose() {
      if (pass) pass.dispose();
      pass = null;
    },
  };
}
```

- [ ] **Step 4: Give the compositor a post hook and a single-world path**

Replace the whole of `src/stage/transition.js` with:
```js
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float uT;
varying vec2 vUv;
vec3 zoom(sampler2D tex, vec2 uv, float strength) {
  vec2 dir = uv - 0.5;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float k = float(i) / 15.0;
    acc += texture2D(tex, uv - dir * strength * k).rgb;
  }
  return acc / 16.0;
}
void main() {
  float pulse = sin(3.14159265 * uT);
  float strength = pulse * 0.45;
  float m = smoothstep(0.3, 0.7, uT);
  vec3 col = mix(zoom(tFrom, vUv, strength), zoom(tTo, vUv, strength), m);
  col += pulse * 0.06;
  gl_FragColor = vec4(col, 1.0);
}`;

const copyShader = /* glsl */ `
uniform sampler2D tFrom;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(tFrom, vUv).rgb, 1.0);
}`;

// Renders worlds to textures and puts them on screen. render() blends two with a radial zoom-blur that peaks
// halfway. single() draws one world through a texture. Both run post(world, target) on each world's texture first;
// the stage uses it for bloom.
export function createCompositor(renderer) {
  const rtA = new THREE.WebGLRenderTarget(1, 1);
  const rtB = new THREE.WebGLRenderTarget(1, 1);
  const blend = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { tFrom: { value: rtA.texture }, tTo: { value: rtB.texture }, uT: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });
  const copy = new THREE.ShaderMaterial({ vertexShader, fragmentShader: copyShader, uniforms: { tFrom: { value: rtA.texture } }, depthTest: false, depthWrite: false });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(geometry, blend);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const toTexture = (world, target, post) => {
    renderer.setRenderTarget(target);
    renderer.render(world.scene, world.camera);
    post(world, target);
  };
  const toScreen = (material) => {
    quad.material = material;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  };

  return {
    resize(width, height) { rtA.setSize(width, height); rtB.setSize(width, height); },
    render(from, to, t, post = () => {}) {
      toTexture(from, rtA, post);
      toTexture(to, rtB, post);
      blend.uniforms.uT.value = t;
      toScreen(blend);
    },
    single(world, post = () => {}) {
      toTexture(world, rtA, post);
      toScreen(copy);
    },
    dispose() { rtA.dispose(); rtB.dispose(); blend.dispose(); copy.dispose(); geometry.dispose(); },
  };
}
```

- [ ] **Step 5: Bloom the worlds that ask for it**

In `src/stage/stage.js`:
1. Change `import { pickTier, TIER_SETTINGS } from '../lib/tier.js';` to:
   ```js
   import { pickTier, TIER_SETTINGS, bloomFor } from '../lib/tier.js';
   import { createBloom } from './bloom.js';
   ```
2. On the line after `const compositor = createCompositor(renderer);`, add:
   ```js
   const bloom = createBloom();
   let bloomBroken = false;
   ```
3. In `resize()`, on the line after `compositor.resize(Math.round(width * dpr), Math.round(height * dpr));`, add:
   ```js
   bloom.resize(Math.round(width * dpr), Math.round(height * dpr));
   ```
4. Directly above `function frame({ time, delta, state, pointer }) {`, add:
   ```js
   // Bloom for worlds that ask for it (world.bloom = { strength, radius, threshold }) on tiers that allow it.
   // If bloom ever fails, the page carries on without it.
   const wantsBloom = (world) => !bloomBroken && bloomFor(tier, world.bloom) !== null;
   function glow(world, target) {
     if (!wantsBloom(world)) return;
     try {
       bloom.apply(renderer, target, bloomFor(tier, world.bloom));
     } catch (err) {
       bloomBroken = true;
       console.warn('[stage] bloom failed; carrying on without it.', err);
     }
   }
   function present(world) {
     if (wantsBloom(world)) compositor.single(world, glow);
     else { renderer.setRenderTarget(null); renderer.render(world.scene, world.camera); }
   }
   ```
5. In `frame()`, replace these four lines:
   ```js
       if (A && B) compositor.render(A, B, state.transition);
       else if (A) { renderer.setRenderTarget(null); renderer.render(A.scene, A.camera); }
       else if (B) { renderer.setRenderTarget(null); renderer.render(B.scene, B.camera); }
       else { renderer.setRenderTarget(null); renderer.clear(); }
   ```
   with:
   ```js
       if (A && B) compositor.render(A, B, state.transition, glow);
       else if (A || B) present(A || B);
       else { renderer.setRenderTarget(null); renderer.clear(); }
   ```

No world asks for bloom yet, so every chapter must look and behave exactly as before. Task 5's Pico world is the first to use it, and its test checks the bloom.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: all PASS.

Run: `npx playwright test tests/e2e/stage.spec.js tests/e2e/picture.spec.js tests/e2e/halcyon-world.spec.js tests/e2e/dead-tired-world.spec.js`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tier.js src/stage/bloom.js src/stage/transition.js src/stage/stage.js tests/unit/tier.test.js
git commit -m "feat: let a world ask the stage for bloom (high and mid tiers only)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The Pico world

**Files:**
- Create: `src/worlds/pico.js`, `tests/e2e/pico-world.spec.js`
- Modify: `src/worlds/names.js` (add `'pico'`), `src/content/projects.js` (Pico's `world`; drop its `worldOptions`)

**Interfaces:**
- Consumes:
  - `sharedPlayer()` and its `advance(seconds, 'world')` and `state.colours` (Task 3);
  - `NUM_LEDS` (Task 1);
  - the stage's optional `bloom` (Task 4);
  - the stage contract `create(ctx, options)` → `{ scene, camera, update, resize, dispose }`.
- Produces:
  - the default export `{ name: 'pico', create }`, which needs no options and no asset files;
  - `bloom: { strength: 1.1, radius: 0.55, threshold: 0.12 }` on the world object.
- Context:
  - `THREE.ColorManagement` is disabled globally, so colours pass through raw.
  - Still mode's 90 frames of 1/30 s advance the show about 150 frames. That is the end of the power-up rainbow, crossfading into rainbow glitter, so the poster is lit.
  - `boot.py`'s pixel values can, in rare cases, dip below 0 (see Task 1). The world clamps them to 0–255 before drawing.

- [ ] **Step 1: Write the failing browser test**

`tests/e2e/pico-world.spec.js`:
```js
import { test, expect } from '@playwright/test';
import sharp from 'sharp';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('the Pico chapter runs the light-show world', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#pico-light-show')).toHaveAttribute('data-world', 'pico');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('still mode renders the light show for its poster, and blooms it on the high tier only', async ({ page }) => {
  const brightness = async (tier) => {
    await page.goto(`./?still=pico-light-show&p=0.85&tier=${tier}`);
    await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
    const { channels } = await sharp(await page.screenshot()).greyscale().stats();
    return channels[0].mean;
  };
  const low = await brightness('low');
  const high = await brightness('high');
  expect(high).toBeGreaterThan(low + 1); // bloom adds light around every lit LED
});
```

Run: `npx playwright test tests/e2e/pico-world.spec.js`
Expected: FAIL, because `data-world` is still `picture`.

- [ ] **Step 2: Implement `src/worlds/pico.js`**

```js
import * as THREE from 'three';
import { NUM_LEDS } from '../lib/led/maths.js';
import { sharedPlayer } from '../lib/led/player.js';

// Oscar's 20-LED strip on a gentle curve, lit frame by frame by the port of his boot.py (src/lib/led/). Each LED is
// an instanced sphere in the colour boot.py computes, with a soft halo; the stage's bloom (high and mid tiers)
// adds the glow on top. The show is the page's shared player: this world drives it while the chapter is live, and
// the page's controls (src/ui/light-show.js) pick effects and pause it.
const LED_RADIUS = 0.055;
const HALO_SIZE = 0.5; // world units across a fully lit LED's halo
const STRIP_HALF_WIDTH = 2.05; // half the strip's width, ends included, for fitting it on screen
const BLOOM = { strength: 1.1, radius: 0.55, threshold: 0.12 };

const haloVertex = /* glsl */ `
attribute vec3 aColor;
uniform float uScale;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float lit = max(aColor.r, max(aColor.g, aColor.b));
  gl_PointSize = uScale * (0.3 + 0.7 * lit) / -mv.z;
  vColor = aColor;
}`;

const haloFragment = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0; // 0 at the centre, 1 at the edge
  if (r > 1.0) discard;
  float a = 1.0 - r;
  gl_FragColor = vec4(vColor * a * a * 0.6, 1.0);
}`;

// A flat ribbon following the curve: the flexible strip the LEDs are soldered to.
function ribbon(curve, height, samples = 96) {
  const positions = [];
  const index = [];
  for (let k = 0; k < samples; k++) {
    const p = curve.getPointAt(k / (samples - 1));
    positions.push(p.x, p.y - height / 2, p.z, p.x, p.y + height / 2, p.z);
    if (k > 0) {
      const a = (k - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return geometry;
}

export default {
  name: 'pico',
  async create() {
    const player = sharedPlayer();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.95, -0.05, -0.45),
      new THREE.Vector3(-1.0, 0.1, 0.05),
      new THREE.Vector3(0, 0, 0.25),
      new THREE.Vector3(1.0, -0.1, 0.05),
      new THREE.Vector3(1.95, 0.05, -0.45),
    ]);
    const at = Array.from({ length: NUM_LEDS }, (_, i) => curve.getPointAt(0.03 + (0.94 * i) / (NUM_LEDS - 1)));

    const stripGeometry = ribbon(curve, 0.2);
    const stripMaterial = new THREE.MeshBasicMaterial({ color: '#141414', side: THREE.DoubleSide });
    const packageGeometry = new THREE.BoxGeometry(0.13, 0.13, 0.03);
    const packageMaterial = new THREE.MeshBasicMaterial({ color: '#34322e' });
    const packages = new THREE.InstancedMesh(packageGeometry, packageMaterial, NUM_LEDS);
    const ledGeometry = new THREE.SphereGeometry(LED_RADIUS, 20, 14);
    const ledMaterial = new THREE.MeshBasicMaterial();
    const leds = new THREE.InstancedMesh(ledGeometry, ledMaterial, NUM_LEDS);
    const matrix = new THREE.Matrix4();
    const unlit = new THREE.Color(0.07, 0.07, 0.07);
    at.forEach((p, i) => {
      packages.setMatrixAt(i, matrix.makeTranslation(p.x, p.y, p.z + 0.016)); // on the strip
      leds.setMatrixAt(i, matrix.makeTranslation(p.x, p.y, p.z + 0.045)); // in front of its package
      leds.setColorAt(i, unlit);
    });

    const haloPositions = new Float32Array(NUM_LEDS * 3);
    at.forEach((p, i) => haloPositions.set([p.x, p.y, p.z + 0.05], i * 3));
    const haloColours = new Float32Array(NUM_LEDS * 3);
    const haloGeometry = new THREE.BufferGeometry();
    haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    haloGeometry.setAttribute('aColor', new THREE.BufferAttribute(haloColours, 3));
    const haloUniforms = { uScale: { value: 1 } };
    const haloMaterial = new THREE.ShaderMaterial({ vertexShader: haloVertex, fragmentShader: haloFragment, uniforms: haloUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const halos = new THREE.Points(haloGeometry, haloMaterial);
    halos.frustumCulled = false;
    halos.renderOrder = 1;

    const strip = new THREE.Group();
    strip.add(new THREE.Mesh(stripGeometry, stripMaterial), packages, leds, halos);
    strip.rotation.set(0.43, -0.5, 0); // the pose at progress 0, so the strip doesn't swing round when the chapter opens
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090909');
    scene.add(strip);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0.35, 4.6);
    camera.lookAt(0, 0, 0);

    const colour = new THREE.Color();
    const level = (v) => Math.max(0, Math.min(255, v)) / 255; // boot.py never clamps below 0
    let shownFrame = -1;
    function paint(colours) {
      colours.forEach(([r, g, b], i) => {
        const R = level(r);
        const G = level(g);
        const B = level(b);
        leds.setColorAt(i, colour.setRGB(0.07 + 0.93 * R, 0.07 + 0.93 * G, 0.07 + 0.93 * B)); // an unlit LED is a dim grey bead
        haloColours.set([R, G, B], i * 3);
      });
      leds.instanceColor.needsUpdate = true;
      haloGeometry.attributes.aColor.needsUpdate = true;
    }
    paint(player.state.colours);

    return {
      scene,
      camera,
      bloom: BLOOM,
      update({ delta, progress, pointer }) {
        const state = player.advance(delta, 'world');
        if (state.frame !== shownFrame) {
          shownFrame = state.frame;
          paint(state.colours);
        }
        const a = Math.min(1, progress / 0.6); // turned to show the curve at 0, facing you by 0.6
        const e = a * a * (3 - 2 * a);
        const turn = -0.5 * (1 - e) + pointer.x * 0.2;
        const tilt = 0.08 + 0.35 * (1 - e) + pointer.y * 0.1;
        strip.rotation.y += (turn - strip.rotation.y) * 0.06;
        strip.rotation.x += (tilt - strip.rotation.x) * 0.06;
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const halfH = tanHalf * camera.position.z;
        const halfW = halfH * camera.aspect;
        const fit = Math.min(1, (halfW * 0.9) / STRIP_HALF_WIDTH);
        strip.scale.setScalar(fit);
        strip.position.y = halfH * (camera.aspect < 0.8 ? 0.3 : 0.2); // keep the strip above the bottom-left title
        haloUniforms.uScale.value = (HALO_SIZE * fit * height * dpr) / (2 * tanHalf);
      },
      dispose() {
        [stripGeometry, packageGeometry, ledGeometry, haloGeometry].forEach((g) => g.dispose());
        [stripMaterial, packageMaterial, ledMaterial, haloMaterial].forEach((m) => m.dispose());
        packages.dispose();
        leds.dispose();
      },
    };
  },
};
```

- [ ] **Step 3: Register the world and switch Pico to it**

In `src/worlds/names.js`, add `'pico'` to the end of `WORLD_NAMES`. The world needs no files, so it gets no `WORLD_ASSETS` entry.

In `src/content/projects.js`, in the `pico-light-show` entry:
- change `world: 'picture',` to `world: 'pico',`;
- delete the `worldOptions: { cover: 'cover.webp', palette: [...] },` line.

`cover.webp` stays, because the entry's `media` still shows it as an illustration. Leave every other field as it is.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all PASS. The registry test finds `src/worlds/pico.js`, and `npm run check` prints `Content OK: 4 projects.`

Run: `npx playwright test tests/e2e/pico-world.spec.js tests/e2e/picture.spec.js tests/e2e/site.spec.js`
Expected: all PASS. Add a temporary `console.log` to record the low-tier and high-tier mean brightness from the bloom test in your report, then remove it before committing. The high-tier mean should be clearly brighter. If the difference is under 2, say so in your report.

- [ ] **Step 5: Look at it**

Write a throwaway Playwright script in this plan's SDD workspace `scratch/` folder, which is gitignored.
- **Server and browser:** run it against `npx vite preview --port 4175 --strictPort` after `npm run build`. Launch with `tools/lib/browser.mjs`'s `launch()` (Edge + SwiftShader).
- **Scroll position:** move to the Pico chapter at a fraction `f` of its intro track: `top = section.getBoundingClientRect().top + scrollY + (section.querySelector('.scene__track').offsetHeight - innerHeight) * f`.
- **Before each shot:** wait for `#pico-light-show.is-live`, then about 3 s.
- **Shots:**
  - 1440×900 with `?tier=high`, at 0.1 and 0.8;
  - 1440×900 with `?tier=low`, at 0.8;
  - 375×812 with `?tier=high`, at 0.1 and 0.8.

Stop the server and view the screenshots with the Read tool. Check that:
- the 20 LEDs read as a strip on a gentle curve, glowing in `boot.py`'s colours, with the dark strip and the LED packages visible;
- at 0.1 the strip is turned to show its curve, and at 0.8 it faces you;
- the high tier visibly blooms and the low tier doesn't, though its halos still glow;
- the chapter title stays readable below the strip;
- on the phone, all 20 LEDs are on screen above the title.

If something reads badly, tune only these, and report what you changed:
- `HALO_SIZE`, `LED_RADIUS` and `BLOOM`;
- the curve's points;
- the turn and tilt amounts;
- the fit factor and the lift in `resize`;
- the strip and package colours.

- [ ] **Step 6: Commit**

```bash
git add src/worlds/pico.js src/worlds/names.js src/content/projects.js tests/e2e/pico-world.spec.js
git commit -m "feat: add the Pico world, a 20-LED strip lit by the boot.py port with bloom" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The light-show controls and the live code panel

**Files:**
- Create: `src/ui/light-show.js`, `tests/e2e/pico-ui.spec.js`
- Modify:
  - `src/content/render.js`: code media gets one span per line;
  - `src/content/validate.js`: adds `live`;
  - `src/content/projects.js`: the Pico code panel;
  - `src/app.js`: starts the controls;
  - `src/styles/chapter.css`;
  - `tests/unit/render.test.js` and `tests/unit/validate.test.js`.

**Interfaces:**
- Consumes:
  - `sharedPlayer()` with `state`, `playing`, `advance(seconds, 'page')`, `select`, `play`, `pause` and `subscribe` (Task 3);
  - `createHighlighter` (Task 3);
  - `EFFECTS` and `POWER_UP` with `name`, `label`, `lines` and `restLine` (Task 2);
  - `NUM_LEDS` (Task 1).
  - The Pico chapter is `section#pico-light-show.scene[data-world="pico"]` (Task 5). Its intro text ends with `.chapter__hook` inside `.scene__frame`.
  - The plugin (`plugins/chapters.js`, M1) passes a code media item's text as `m.code`. That text is the file sliced to `m.lines` with `\r?\n` split, and joined with `\n`.
- Produces:
  - Code media render as `<figure class="media media--code"[ data-live]><pre …><code>` with one `<span class="code-line" data-line="N">` per line. N counts from `m.lines[0]`, or from 1.
  - A media item's `live: true` is allowed only on code media.
  - `createLightShow({ doc, reduced })` returns `null` when the page has no pico chapter, and otherwise `{ player, controls }`.
  - DOM, built by JS:
    - `.lightshow` (`role="group"`, `aria-label="Light show"`) after the hook. It holds the play/pause button `.lightshow__play` (text `Pause` or `Play`) and six `.chip` buttons with `aria-pressed`.
    - `.lightshow__now`, at the top of the live code figure. It holds `.lightshow__strip` (20 `<i>` dots, `aria-hidden`) and `.lightshow__name` (the playing effect's `boot.py` name).
    - `.code-line.is-running` marks the highlighted line.

- [ ] **Step 1: Write the failing unit tests**

Append to the `describe` block in `tests/unit/render.test.js` that holds the existing `'escapes code'` test:
```js
  it('numbers code lines from the first line shown, and marks live panels', () => {
    const html = renderMedia({ type: 'code', src: 'a.py', lines: [10, 11], code: 'a = 1\nb < 2', live: true }, project(), '/');
    expect(html).toContain('<figure class="media media--code" data-live>');
    expect(html).toContain('<span class="code-line" data-line="10">a = 1</span>\n<span class="code-line" data-line="11">b &lt; 2</span>');
    expect(renderMedia({ type: 'code', src: 'a.py', code: 'x\r\ny' }, project(), '/')).toContain('<span class="code-line" data-line="1">x</span>\n<span class="code-line" data-line="2">y</span>');
  });
```

Append inside the `describe('validateProjects', …)` block in `tests/unit/validate.test.js`:
```js
  it('only lets code media be live, and live is true or false', () => {
    expect(errorsFor({ media: [{ type: 'code', src: 'a.py', live: 'yes' }] })[0]).toMatch(/"live" is true or false, and only for code media/);
    expect(errorsFor({ media: [{ type: 'image', src: 'shot.webp', alt: 'A shot', live: true }] })[0]).toMatch(/only for code media/);
    expect(errorsFor({ media: [{ type: 'code', src: 'a.py', live: true }] })).toEqual([]);
  });
```

Run: `npx vitest run tests/unit/render.test.js tests/unit/validate.test.js`
Expected: the two new tests FAIL.

- [ ] **Step 2: Render numbered code lines and validate `live`**

In `src/content/render.js`, replace the `case 'code':` line and its `return` line with:
```js
    case 'code': {
      // One span per line, numbered as in the source file, so the light show can highlight the line it's running.
      const first = m.lines ? m.lines[0] : 1;
      const lines = (m.code ?? '').split(/\r?\n/).map((text, i) => `<span class="code-line" data-line="${first + i}">${escapeHtml(text)}</span>`).join('\n');
      return `<figure class="media media--code"${m.live ? ' data-live' : ''}><pre tabindex="0" data-lenis-prevent><code>${lines}</code></pre>${figcaption(m)}</figure>`;
    }
```

In `src/content/validate.js`, inside `p.media.forEach`, add this directly after the code `lines` check:
```js
      if (m.live !== undefined && (m.type !== 'code' || typeof m.live !== 'boolean')) fail(`${at}: "live" is true or false, and only for code media`);
```

Run: `npx vitest run tests/unit/render.test.js tests/unit/validate.test.js`
Expected: PASS.

- [ ] **Step 3: Write the failing browser tests**

`tests/e2e/pico-ui.spec.js`:
```js
import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);
const dots = (page) => page.locator('#pico-light-show .lightshow__strip i').evaluateAll((els) => els.map((el) => el.style.backgroundColor).join('|'));

test('the chips pick an effect, and the code panel follows without moving the page', async ({ page }) => {
  await page.goto('./');
  await scrollToId(page, 'pico-light-show');
  const show = page.locator('#pico-light-show');
  await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
  await expect(show.locator('.lightshow .chip')).toHaveCount(6);
  const y = await page.evaluate(() => scrollY);
  await show.getByRole('button', { name: 'Fire' }).click();
  await expect(show.getByRole('button', { name: 'Fire' })).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
  await expect(show.locator('.lightshow__name')).toHaveText('fire');
  const line = Number(await show.locator('.code-line.is-running').getAttribute('data-line'));
  expect(line).toBeGreaterThanOrEqual(195);
  expect(line).toBeLessThanOrEqual(220);
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(2);
});

test('pause stops the show and play starts it again', async ({ page }) => {
  await page.goto('./');
  await scrollToId(page, 'pico-light-show');
  const show = page.locator('#pico-light-show');
  await expect(show).toHaveClass(/is-live/, { timeout: 30_000 });
  await show.getByRole('button', { name: 'Pause' }).click();
  const paused = await dots(page);
  await page.waitForTimeout(600);
  expect(await dots(page)).toBe(paused);
  await show.getByRole('button', { name: 'Play' }).click();
  await expect.poll(() => dots(page), { timeout: 5_000 }).not.toBe(paused);
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('nothing moves until Play is pressed, then the show runs without the 3D stage', async ({ page }) => {
    await page.goto('./');
    await scrollToId(page, 'pico-light-show');
    const show = page.locator('#pico-light-show');
    await expect(show.getByRole('button', { name: 'Play' })).toBeVisible();
    const before = await dots(page);
    await page.waitForTimeout(800);
    expect(await dots(page)).toBe(before);
    await expect(page.locator('html')).not.toHaveClass(/webgl/);
    await show.getByRole('button', { name: 'Play' }).click();
    await expect.poll(() => dots(page), { timeout: 5_000 }).not.toBe(before);
    await expect(show.locator('.code-line.is-running')).toHaveCount(1);
  });
});

test('without WebGL the show still runs on the dot strip', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  await page.goto('./');
  await scrollToId(page, 'pico-light-show');
  const before = await dots(page);
  await expect.poll(() => dots(page), { timeout: 5_000 }).not.toBe(before);
});
```

Run: `npx playwright test tests/e2e/pico-ui.spec.js`
Expected: FAIL, because there are no chips yet.

- [ ] **Step 4: Build the controls**

`src/ui/light-show.js`:
```js
import { EFFECTS, POWER_UP } from '../lib/led/effects.js';
import { NUM_LEDS } from '../lib/led/maths.js';
import { sharedPlayer } from '../lib/led/player.js';
import { createHighlighter } from '../lib/led/highlight.js';

const byName = Object.fromEntries([POWER_UP, ...EFFECTS].map((e) => [e.name, e]));
const channel = (v) => Math.max(0, Math.min(255, v));
const rgb = ([r, g, b]) => `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`;

// The Pico chapter's controls, built when the page has a chapter running the pico world:
// - over the 3D strip: play/pause and one chip per effect;
// - at the top of the live code panel: the effect that's playing and a strip of 20 dots in the LEDs' colours
//   (with no 3D world, for example under reduced motion, this is where you watch the show);
// - in the code panel: the boot.py line the show is running, highlighted.
// The page's own loop drives the shared player while the chapter is on screen; the player ignores it whenever the
// 3D world is driving (see player.js).
export function createLightShow({ doc, reduced = false }) {
  const chapter = doc.querySelector('.scene[data-world="pico"]');
  if (!chapter) return null;
  const win = doc.defaultView;
  const player = sharedPlayer();
  if (reduced) player.pause(); // spec §8.2: demos only run when the visitor presses play

  const button = (className, text) => {
    const el = doc.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = text;
    return el;
  };
  const controls = doc.createElement('div');
  controls.className = 'lightshow';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Light show');
  const playButton = button('lightshow__play', 'Pause');
  playButton.addEventListener('click', () => (player.playing ? player.pause() : player.play()));
  const chips = EFFECTS.map((effect, index) => {
    const chip = button('chip', effect.label);
    chip.dataset.effect = effect.name;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => player.select(index));
    return chip;
  });
  controls.append(playButton, ...chips);
  chapter.querySelector('.chapter__hook').after(controls);

  const figure = chapter.querySelector('.media--code[data-live]');
  const pre = figure ? figure.querySelector('pre') : null;
  const lineEls = new Map(pre ? Array.from(pre.querySelectorAll('.code-line'), (el) => [Number(el.dataset.line), el]) : []);
  let dots = [];
  let nameEl = null;
  if (figure) {
    const now = doc.createElement('div');
    now.className = 'lightshow__now';
    const strip = doc.createElement('span');
    strip.className = 'lightshow__strip';
    strip.setAttribute('aria-hidden', 'true');
    dots = Array.from({ length: NUM_LEDS }, () => strip.appendChild(doc.createElement('i')));
    nameEl = doc.createElement('span');
    nameEl.className = 'lightshow__name mono';
    now.append(strip, nameEl);
    figure.prepend(now);
  }

  // Scrolls the code box itself, never the page.
  const reveal = (el, atTop) => {
    if (!pre || !el) return;
    const outside = el.offsetTop < pre.scrollTop || el.offsetTop + el.offsetHeight > pre.scrollTop + pre.clientHeight;
    if (atTop || outside) pre.scrollTop = Math.max(0, el.offsetTop - (atTop ? 8 : pre.clientHeight / 3));
  };

  const pick = createHighlighter();
  let shownPlaying = null;
  let shownEffect = null;
  let shownFrame = -1;
  let shownLine = null;
  function render(state) {
    if (player.playing !== shownPlaying) {
      shownPlaying = player.playing;
      playButton.textContent = player.playing ? 'Pause' : 'Play';
    }
    if (state.effect !== shownEffect) {
      shownEffect = state.effect;
      chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.effect === state.effect)));
      if (nameEl) nameEl.textContent = state.effect;
      reveal(lineEls.get(byName[state.effect].lines[0]), true);
    }
    if (state.frame !== shownFrame) {
      shownFrame = state.frame;
      state.colours.forEach((c, i) => { if (dots[i]) dots[i].style.backgroundColor = rgb(c); });
    }
    const line = pick(state.line, byName[state.effect].restLine, win.performance.now());
    if (line !== shownLine) {
      lineEls.get(shownLine)?.classList.remove('is-running');
      shownLine = line;
      const el = lineEls.get(line);
      if (el) {
        el.classList.add('is-running');
        reveal(el, false);
      }
    }
  }
  player.subscribe(render);
  render(player.state);

  // The page's loop: runs while the chapter is on screen and the tab is visible.
  let raf = 0;
  let last = 0;
  let onScreen = false;
  const loop = (time) => {
    raf = win.requestAnimationFrame(loop);
    const seconds = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    player.advance(seconds, 'page');
  };
  const run = () => {
    if (onScreen && !doc.hidden && !raf) {
      last = 0;
      raf = win.requestAnimationFrame(loop);
    }
  };
  const stop = () => {
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
  };
  if ('IntersectionObserver' in win) {
    new win.IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) run();
      else stop();
    }).observe(chapter);
  } else {
    onScreen = true;
    run();
  }
  doc.addEventListener('visibilitychange', () => (doc.hidden ? stop() : run()));
  return { player, controls };
}
```

In `src/app.js`:
- change `import { autoplayVideos } from './ui/media.js';` to:
  ```js
  import { autoplayVideos } from './ui/media.js';
  import { createLightShow } from './ui/light-show.js';
  ```
- change `autoplayVideos(doc, { reduced });` to:
  ```js
  autoplayVideos(doc, { reduced });
  createLightShow({ doc, reduced });
  ```
Still mode returns before this point, so posters never get controls. The world still drives the show for the poster.

Append to `src/styles/chapter.css`:
```css
.lightshow { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; max-width: 640px; }
.lightshow button { padding: 9px 14px; border: 1px solid var(--faint); border-radius: 999px; background: rgba(9, 9, 9, 0.6); color: var(--paper); font: 500 12px/1 var(--font-mono); letter-spacing: 0.04em; cursor: pointer; }
.lightshow button:hover { border-color: var(--paper); }
.lightshow .chip[aria-pressed="true"] { background: var(--paper); border-color: var(--paper); color: var(--ink); }
.lightshow__play { min-width: 74px; }
.lightshow__now { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; margin-bottom: 12px; color: var(--muted); font-size: 13px; }
.lightshow__strip { display: inline-flex; gap: 4px; padding: 7px 9px; border-radius: 999px; background: #141414; }
.lightshow__strip i { width: 9px; height: 9px; border-radius: 50%; background: #000; }
.media--code pre { position: relative; }
.code-line { display: inline-block; min-width: 100%; min-height: 1.6em; vertical-align: top; }
.code-line.is-running { background: rgba(57, 208, 255, 0.16); box-shadow: inset 3px 0 0 #39d0ff; }
```
`position: relative` on the `pre` makes each line's `offsetTop` measure from the code box, which `reveal()` relies on. `min-height` keeps blank lines one line tall.

In `src/content/projects.js`, in the `pico-light-show` entry, replace the code media item with:
```js
      { type: 'code', src: 'boot.py', lines: [106, 283], live: true, caption: 'The seven effects in boot.py. While the show plays, the line it’s running lights up.' },
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all PASS.

Run: `npx playwright test tests/e2e/pico-ui.spec.js tests/e2e/pico-world.spec.js tests/e2e/site.spec.js tests/e2e/navigation.spec.js tests/e2e/stage.spec.js`
Expected: all PASS. `site.spec.js` includes the 375 px no-sideways-scrolling check, so the chips must wrap.

- [ ] **Step 6: Look at it**

Reuse your Task 5 approach and save the screenshots in the same `scratch/` folder:
- **1440×900, intro:** the Pico chapter's intro at 0.8, with the chips under the hook.
- **375×812, intro:** the same view on a phone.
- **1440×900, code panel:** scroll the live code figure into view after clicking the "Twin comets" chip.

View them, and check that:
- the chips wrap neatly and don't cover the title;
- the pressed chip stands out;
- the dot strip shows the LED colours;
- the highlighted line is visible inside the code box;
- blank code lines keep their height.

Fix only CSS for anything wrong.

- [ ] **Step 7: Commit**

```bash
git add src/ui/light-show.js src/app.js src/styles/chapter.css src/content/render.js src/content/validate.js src/content/projects.js tests/unit/render.test.js tests/unit/validate.test.js tests/e2e/pico-ui.spec.js
git commit -m "feat: add the light-show chips, the dot strip and the live code panel" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Posters, docs and a full check

**Files:**
- Modify: `CLAUDE.md`
- Regenerated and committed: `public/posters/pico-light-show.webp` (the other five posters must come out byte-identical)

**Interfaces:**
- Consumes: everything above. `npm run posters` renders each scene in still mode at `?tier=high`.
- Produces: the Pico poster of the lit, blooming strip, and an accurate CLAUDE.md.
- Context: Pico's `cover.webp` stays, because it is still a media item. Unlike milestones 2 and 3, there is no cover to drop.

- [ ] **Step 1: Regenerate the posters and look**

Run: `npm run posters && npm run check:media`
Expected: six `poster:` lines and no `[page]` errors; the metadata check passes.

Run: `git status --short public/posters`
Expected: only `public/posters/pico-light-show.webp` changed.

Open `public/posters/pico-light-show.webp` with the Read tool. It should show the glowing strip of 20 LEDs in rainbow colours on the dark background.

- [ ] **Step 2: Update CLAUDE.md**

1. **Commands table.** Add this row after the `npm run layers:dead-tired` row:
   ```
   | `npm run led:reference` | Runs the real Pico `boot.py` under Python 3 and rewrites `tests/fixtures/boot-reference.json`, which the LED-port tests compare against (only needed if `boot.py` changes) |
   ```
2. **World interface code block.** Change `ready /* optional */,` to `ready /* optional */, bloom /* optional */,`.
3. **The paragraph about `ready`.** After it, add: "`bloom` is optional too: `{ strength, radius, threshold }` asks the stage to bloom that world's frame, which it does on the high and mid tiers and never on low."
4. **The `src/lib/` bullet.** Replace "- `src/lib/`: pure functions with unit tests." with: "- `src/lib/`: pure functions with unit tests. `src/lib/led/` is a frame-exact port of the Pico's `boot.py`: its maths, effects, light-show timeline and a player. The `pico` world and `src/ui/light-show.js` share one player."
5. **The Status section.** Replace its paragraph with:
   ```
   Milestones 1 (shell), 2 (HALCYON world), 3 (DEAD TIRED world) and 4 (Pico Light Show world) are in place. HALCYON uses its own "halcyon" world; DEAD TIRED uses the reusable "layers" world (a design's layers, from a layers.json manifest, float apart and slide together); Pico Light Show uses the "pico" world (a 20-LED strip running the boot.py port, with bloom, effect chips and a live code panel); ASCII Mirror still uses the "picture" world; the hero uses "index" and the next slot uses "dormant". The custom world still to come is ASCII Mirror (5). Launch is milestone 6. Plans live in `docs/superpowers/plans/`.
   ```

- [ ] **Step 3: Run everything and review the screenshots**

Run: `npm test && npm run test:e2e`
Expected: everything passes. The full e2e run takes a few minutes; run it in the background and wait for it.

Open these with the Read tool:
- `screens/desktop-pico-light-show.png`
- `screens/desktop-pico-light-show-panel.png`
- `screens/mobile-pico-light-show.png`
- `screens/mobile-pico-light-show-panel.png`

Check that the title and chips are readable over the strip, the code panel and dot strip sit correctly, and nothing overflows on the phone. Fix only CSS for anything wrong, then rerun.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md public/posters
git commit -m "chore: regenerate the Pico poster and update CLAUDE.md for the light-show world" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Milestone review with Oscar

**Files:** none, unless the review asks for fixes.

- [ ] **Step 1: Check everything passes.** Run `npm test && npm run test:e2e && npm run check && npm run check:media`. Expected: all green.
- [ ] **Step 2: Show Oscar the chapter.**
  - Stop any running dev server, then start the preview with `preview_start` (name `portfolio-dev`, from `C:\Users\Oscar\Downloads\.claude\launch.json`).
  - Scroll to the Pico chapter and watch the power-up intro. Click two chips, then scroll down to the code panel.
  - Take screenshots and send the best two to Oscar with `SendUserFile`, then ask him to try it himself in the preview pane.
- [ ] **Step 3: Ask for his verdict.**
  - Ask Oscar whether the light show looks and feels right.
  - Name the plan's deliberate readings of the spec:
    - pre-gamma colours on screen;
    - Play under reduced motion runs the dot strip;
    - event lines hold for 0.4 s;
    - a chip restarts the effect it names.
  - Make the small fixes he asks for, rerun Step 1 and commit each fix.

Milestone 4 is done when Oscar says it looks right.
