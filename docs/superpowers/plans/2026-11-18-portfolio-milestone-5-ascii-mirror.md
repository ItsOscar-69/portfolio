# Portfolio Milestone 5 (ASCII Mirror world) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the ASCII Mirror chapter its own world:
- Oscar's Pi 5 build rendered as green ASCII, which explodes as you scroll, with the printed camera mount highlighted;
- an opt-in webcam mirror through the same ASCII pass;
- a normal-shaded 3D model viewer with a part list in the content panel;
- a recording of the Windows demo.

**Architecture:**
- **The model.** `tools/publish-model.mjs` compresses the Pi model with gltf-transform: meshopt plus quantised geometry, all 7 named parts kept. The result is 892 KB.
- **The `ascii` world.** Each frame it renders the model into a tiny target, one pixel per character cell. A full-screen shader then swaps each cell for a ramp character picked by brightness. The mount is drawn with a green tint, and the shader turns that into near-white characters.
- **The mirror.** It owns the camera stream and shares the video element with the world through a small module, so the webcam feeds the same pass. With no 3D stage, the mirror draws the webcam as text itself.
- **The viewer.** It is a UI media block with its own small renderer, created only when the figure comes near the screen.

Part A (Tasks 1–4) ships the world and the mirror on its own. Part B (Tasks 5–7) adds the viewer and the demo recording.

**Tech Stack:** The same stack as Milestones 1–4: Vite 6.4.1, three.js 0.181.0, Lenis 1.3.11, Vitest 3.2.4, Playwright 1.61.1 on Microsoft Edge, sharp 0.32.6 and ffmpeg-static 5.2.0. Four new dev dependencies are added for gltf-transform (see Global Constraints). `py` (the Python launcher, which has pygame-ce and numpy) is used only to record the demo.

**Spec:** `docs/superpowers/specs/2026-11-16-portfolio-design.md`. The relevant sections are:
- §4.3: the ASCII Mirror;
- §5: media;
- §6: the stage and UI units;
- §7: the Pi model compressed with gltf-transform to 1.5 MB or less, with part names preserved;
- §8: the quality bars (the webcam is opt-in, with clear denied and unavailable messages);
- §12: the Pi software itself is out of scope.

**Builds on:** `main` at `ce5ec21` (milestones 1–4 merged). `CLAUDE.md` explains the current code.

**Proven before planning (18 Nov 2026, on this PC):**
- **gltf-transform on Node 18.16.** gltf-transform 4.5.1 runs here with the override below.
  - Without the override, `@gltf-transform/functions` loads `ndarray-pixels` 5.2.0, which loads `sharp` 0.35. That `sharp` fails on Node 18.16 with `SyntaxError: Unexpected token 'with'`.
  - With `"overrides": { "ndarray-pixels": { "sharp": "$sharp" } }`, `npm ci` gives one deduplicated `sharp` 0.32.6, and compression runs.
- **The compressed model.**
  - Output: 892,472 bytes and 310,017 triangles, with the 7 node names unchanged.
  - The file declares `EXT_meshopt_compression` and `KHR_mesh_quantization`, its generator is `glTF-Transform v4.5.1`, and it has no extras.
  - three.js loads it in 65 ms in Edge through `GLTFLoader` and `MeshoptDecoder`.
  - The loaded part nodes carry their own position and uniform scale (quantisation), so the explode must add to the base position.
  - The model has no normals, so materials use `flatShading`.
  - GLTFLoader renames nodes, for example `Camera mount (printed)` becomes `Camera_mount_(printed)`.
- **The ASCII pass under Edge and SwiftShader.**
  - The full model, rendered into a 160×100 target, then through the glyph shader to 1600×1000, takes 4,477 ms for 90 frames, about 50 ms a frame, with no GL errors.
  - The green-tinted mount came out as near-white characters.
- **The Windows demo records headless.** `ascii_cyberpunk.py` runs under SDL's dummy video driver. A wrapper drives `App.handle` / `update` / `draw` with a scripted mouse and saves 1280×720 frames. The site bundles only JetBrains Mono 400.

**Deliberate readings of the spec (Oscar reviews these):**
- **The highlight.** The spec's ASCII is a single colour, so the printed camera mount is highlighted by drawing its characters near-white (`#e9fff2`) instead of green.
- **No 3D stage.** With reduced motion, without WebGL or with a failed world, the mirror draws the webcam as live text in the same ramp and colours, over the chapter's poster. It still starts only on a click.
- **When the camera stops.** It stops on Stop, when the chapter scrolls off screen, when the tab is hidden and when the page closes. It never stays on behind your back.
- **The viewer.** It has its own small renderer, which spec §6 lists as a UI media block. It turns with a drag but never zooms on the wheel, and vertical swipes scroll the page, so it can't trap scrolling. Hovering or focusing a part in its list highlights that part.
- **No simplification.** The full-detail model is 892 KB, well under the 1.5 MB target.
- **The picture world.** No chapter uses it after this milestone. It stays registered as the fallback world for new projects. Its cover-failure test moves to the ascii world's model-failure test.

## Global Constraints

- **Node:** must run on Node 18.16.0 (this PC) and Node 20 (CI).
- **Dependencies:** keep every existing pinned version exactly as it is.
  - Add only these four dev dependencies, pinned exactly: `@gltf-transform/core` 4.5.1, `@gltf-transform/extensions` 4.5.1, `@gltf-transform/functions` 4.5.1 and `meshoptimizer` 0.25.0.
  - Add only this override: `"overrides": { "ndarray-pixels": { "sharp": "$sharp" } }`.
  - No other new packages.
- **Python:** `py` (with pygame-ce and numpy) is used only by `npm run video:ascii`. Tests and CI never need Python.
- **Playwright browser:** Playwright drives the installed Microsoft Edge (`channel: 'msedge'`) with SwiftShader WebGL. SwiftShader picks the low tier, so use `?tier=high` where the tier matters.
- **The repo will be public:**
  - No file or commit message may contain Oscar's surname, school, state, assignment name or any email address. The only name shown is "Oscar".
  - The Windows demo's location on this PC is never written into the repo: not the plan, `package.json`, a tool or a commit. The tools read the copy in `raw/ascii/`, which is gitignored.
  - `tests/unit/privacy.test.js` must keep passing.
- **Camera privacy (spec §4.3):**
  - The webcam starts only on a click.
  - It requests video only, never audio.
  - Frames are only drawn in the page. No mirror code sends, uploads, stores or records anything.
  - A visible "Camera on" indicator with a Stop button shows while it runs.
- **Credit:**
  - Oscar planned the project and built the hardware.
  - Claude Code modelled the parts, designed the mount and wrote the Windows demo, as the chapter's copy already says.
  - New captions must say the same and claim nothing more.
- **Git identity:** commit with the existing global git identity. Never change git config.
- **No pushing:** do not push and do not create a remote. Publishing is milestone 6.
- **No third parties:** the built site makes no requests to third-party hosts.
- **Look:** the site is dark only. The ASCII is the ramp ` .:-=+*#%@`, in green `#39ff88` on `#020604` (spec §4.3). The chapter title keeps its mono font.
- **Reduced motion:**
  - no 3D stage, and nothing animates by itself;
  - the mirror runs only after the visitor clicks "Try the mirror";
  - the viewer turns only when dragged.
- **Base path and escaping:** every URL written into HTML goes through `withBase()` with `BASE` from `site.config.js`. Every attribute value and text node goes through `escapeHtml()`.
- **Never commit:** `raw/`, `sources.local.json`, `privacy.local.json` or `screens/`.
- **Media:** published images are WebP with no EXIF, XMP or IPTC metadata. `npm test` enforces this. The demo MP4 is written with its metadata stripped.
- **Commit messages:** every one ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pass it as a second `-m`.
- **Working directory and branch:** all commands run from `C:\Users\Oscar\Downloads\portfolio` in Git Bash, on the branch `milestone-5-ascii` (cut from `main` when execution starts).
- **Dev server and git:** stop any running dev server before switching branches, because Windows file locks block `git checkout`.

## Review Focus

1. **The camera is blocked or missing.** The visitor sees a clear message, and the model stays on screen. Task 4 tests this.
2. **The camera left on behind your back.** If the visitor scrolls away, or the tab is hidden while the mirror runs, the camera stops: its track ends and the indicator goes. Task 4 tests this.
3. **A frame leaves the browser.** While the mirror runs, no request is sent anywhere, and audio is never requested. Task 4 tests this.
4. **The viewer traps scrolling.** A mouse wheel over the 3D viewer must scroll the page, not zoom. Task 5 tests this.
5. **The model fails to load.** The ASCII chapter falls back to its poster (Task 3 tests this). The viewer keeps its poster and the part list (Task 5 tests this).

---

## File Structure

```
package.json                          MOD  + 4 pinned dev deps, the override, model:pi / poster:model / video:ascii; media runs model:pi
package-lock.json                     MOD
tools/publish-model.mjs               NEW  raw/pi/baseline_assembly.glb → public/projects/ascii-mirror/pi-assembly.glb
src/lib/pi-parts.js                   NEW  the 7 parts: id, label, GLB node name, explode offset, highlight; meshName/partFor
src/lib/ascii.js                      NEW  the ramp, colours, cell size; charFor, gridFor, asciiRows
src/lib/camera.js                     NEW  camera constraints (video only), cameraProblem(error) messages, the shared `mirror`
src/worlds/lib/glyphs.js              NEW  the ramp's glyph atlas texture (waits for JetBrains Mono 400)
src/worlds/ascii.js                   NEW  the model (or the webcam) through the ASCII pass; explode; highlighted mount
src/worlds/names.js                   MOD  + 'ascii'; WORLD_ASSETS.ascii = { model: 'one' }
src/ui/mirror.js                      NEW  "Try the mirror": camera, indicator, Stop, messages, auto-stop, text fallback
src/ui/model-viewer.js                NEW  the panel's normal-shaded viewer with its part list
src/app.js                            MOD  starts the mirror and the viewers (each guarded)
src/styles/chapter.css                MOD  mirror controls, the text fallback, the viewer and its part list
src/content/projects.js               MOD  ASCII Mirror: world 'ascii'; model and demo media
tools/model-poster.mjs                NEW  screenshots the real viewer into model-poster.webp
tools/record-ascii-demo.py            NEW  records the Windows demo headless, frame by frame
tools/capture-ascii-demo.mjs          NEW  runs the recorder, encodes demo.mp4 and demo-poster.webp
public/projects/ascii-mirror/         NEW  pi-assembly.glb, model-poster.webp, demo.mp4, demo-poster.webp
public/posters/ascii-mirror.webp      REGENERATED
tests/unit/pi-model.test.js           NEW
tests/unit/ascii.test.js              NEW
tests/unit/camera.test.js             NEW
tests/e2e/ascii-world.spec.js         NEW
tests/e2e/mirror.spec.js              NEW
tests/e2e/model-viewer.spec.js        NEW
tests/e2e/picture.spec.js             MOD  the cover-failure test moves to ascii-world.spec.js
CLAUDE.md                             MOD  commands, world list, status
```

---

## Part A: the world and the mirror

### Task 1: The compressed Pi model

**Files:**
- Create: `tools/publish-model.mjs`, `src/lib/pi-parts.js`, `tests/unit/pi-model.test.js`
- Modify: `package.json`, `package-lock.json`
- Generated and committed: `public/projects/ascii-mirror/pi-assembly.glb`

**Interfaces:**
- **Consumes:** `raw/pi/baseline_assembly.glb`, which is gitignored and was copied in M1 by `tools/copy-sources.mjs`. It is 6.2 MB, has 7 meshes, CAD Z-up, in millimetres.
- **Produces:**
  - `PARTS` is an array of 7 `{ id, label, node, explode: [x, y, z] mm, highlight? }`, in stacking order:
    - ids: `case`, `pi5`, `hat-hardware`, `ai-hat`, `mount`, `camera`, `ribbon`;
    - `node` is the exact GLB node name;
    - only `mount` has `highlight: true`.
  - `meshName(node)` gives the name GLTFLoader assigns.
  - `partFor(meshName)` gives the matching part, or `null`.
  - `public/projects/ascii-mirror/pi-assembly.glb` is meshopt-compressed, 1.5 MB or less, and has the 7 node names.

- [ ] **Step 1: Add the dependencies and the override**

In `package.json`, add these to `"devDependencies"`, keeping the keys alphabetical:
```json
"@gltf-transform/core": "4.5.1",
"@gltf-transform/extensions": "4.5.1",
"@gltf-transform/functions": "4.5.1",
"meshoptimizer": "0.25.0",
```
Add a top-level `"overrides"` block after `"devDependencies"`:
```json
"overrides": {
  "ndarray-pixels": { "sharp": "$sharp" }
}
```
In `"scripts"`:
- add `"model:pi": "node tools/publish-model.mjs",`;
- in `"media"`, insert ` && node tools/publish-model.mjs` immediately before ` && node tools/check-media.mjs`.

Run: `npm install`
Expected: it finishes. npm may warn about deprecated packages, but there must be no `EBADENGINE` warning for `sharp`.

Run: `npm ls sharp`
Expected: one `sharp@0.32.6`. Under `ndarray-pixels` it shows as `overridden` / `deduped`, never 0.35.

- [ ] **Step 2: Write the failing test**

`tests/unit/pi-model.test.js`:
```js
import { it, expect } from 'vitest';
import fs from 'node:fs';
import { PARTS, meshName, partFor } from '../../src/lib/pi-parts.js';

const glb = fs.readFileSync('public/projects/ascii-mirror/pi-assembly.glb');
const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));

it('is the compressed Pi build: 1.5 MB or less, meshopt-compressed with quantised geometry', () => {
  expect(glb.readUInt32LE(0)).toBe(0x46546c67); // "glTF"
  expect(glb.length).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  expect(json.extensionsUsed).toEqual(expect.arrayContaining(['EXT_meshopt_compression', 'KHR_mesh_quantization']));
});

it('keeps all 7 named parts, and the parts table matches them exactly', () => {
  expect(json.nodes.map((n) => n.name).sort()).toEqual(PARTS.map((p) => p.node).sort());
  expect(PARTS.filter((p) => p.highlight).map((p) => p.id)).toEqual(['mount']);
});

it('finds each part by the name three.js gives it', () => {
  expect(meshName('Camera mount (printed)')).toBe('Camera_mount_(printed)');
  expect(meshName('AI HAT+ 13 TOPS')).toBe('AI_HAT+_13_TOPS');
  for (const part of PARTS) expect(partFor(meshName(part.node))).toBe(part);
  expect(partFor('Something_else')).toBeNull();
});
```

Run: `npx vitest run tests/unit/pi-model.test.js`
Expected: FAIL, because `src/lib/pi-parts.js` and the model don't exist yet.

- [ ] **Step 3: Write the parts table and the tool**

`src/lib/pi-parts.js`:
```js
// The 7 named parts of Oscar's Pi 5 build, as named in pi-assembly.glb (exported from the OpenSCAD model Claude Code
// made from the official drawings). explode: how far each part moves, in mm (the model's units, CAD Z-up), when the
// assembly is fully exploded. The stack rises along +Z; the camera, its ribbon and the printed mount hang off the
// front (-Y), so they also move forward.
export const PARTS = [
  { id: 'case', label: 'Case', node: 'Case base + frame (approx)', explode: [0, 0, 0] },
  { id: 'pi5', label: 'Raspberry Pi 5', node: 'Raspberry Pi 5', explode: [0, 0, 14] },
  { id: 'hat-hardware', label: 'HAT spacers and header', node: 'HAT spacers + stacking header + PCIe FFC', explode: [0, 0, 28] },
  { id: 'ai-hat', label: 'AI HAT+', node: 'AI HAT+ 13 TOPS', explode: [0, 0, 42] },
  { id: 'mount', label: 'Camera mount (printed)', node: 'Camera mount (printed)', explode: [0, -18, 30], highlight: true },
  { id: 'camera', label: 'Camera Module 3', node: 'Camera Module 3', explode: [0, -34, 34] },
  { id: 'ribbon', label: 'Camera ribbon', node: 'Camera ribbon cable', explode: [0, -26, 38] },
];

// three.js's GLTFLoader renames nodes: whitespace becomes "_" and [ ] . : / are dropped (PropertyBinding.sanitizeNodeName).
export const meshName = (node) => node.replace(/\s/g, '_').replace(/[[\].:/]/g, '');
export const partFor = (name) => PARTS.find((p) => meshName(p.node) === name) || null;
```

`tools/publish-model.mjs`:
```js
// Compresses the Pi 5 build (raw/pi/baseline_assembly.glb) for the site: meshopt compression with quantised geometry
// (spec §7), all 7 named parts kept. Full detail lands well under the 1.5 MB target, so nothing is simplified.
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { PARTS } from '../src/lib/pi-parts.js';

const SRC = 'raw/pi/baseline_assembly.glb';
const OUT = 'public/projects/ascii-mirror/pi-assembly.glb';
const LIMIT = 1.5 * 1024 * 1024;

if (!fs.existsSync(SRC)) throw new Error(`${SRC} is missing (it is gitignored; npm run media copies it there), so nothing was changed`);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(SRC);
await doc.transform(dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const names = doc.getRoot().listNodes().map((n) => n.getName());
const missing = PARTS.filter((p) => !names.includes(p.node)).map((p) => p.node);
if (missing.length) throw new Error(`${SRC} is missing parts: ${missing.join(', ')}`);
await io.write(OUT, doc);
const bytes = fs.statSync(OUT).size;
if (bytes > LIMIT) throw new Error(`${OUT} is ${bytes} bytes, over the 1.5 MB target`);
console.log(`wrote ${OUT}: ${Math.round(bytes / 1024)} KB, ${names.length} parts`);
```

Run: `npm run model:pi`
Expected: `wrote public/projects/ascii-mirror/pi-assembly.glb: 872 KB, 7 parts`. gltf-transform may also print `prune: Removed types...` lines.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/pi-model.test.js && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tools/publish-model.mjs src/lib/pi-parts.js tests/unit/pi-model.test.js public/projects/ascii-mirror/pi-assembly.glb
git commit -m "feat: publish the Pi 5 build as a meshopt-compressed model with its 7 named parts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The ASCII maths and the camera rules

**Files:**
- Create: `src/lib/ascii.js`, `src/lib/camera.js`, `tests/unit/ascii.test.js`, `tests/unit/camera.test.js`

**Interfaces:**
- **Produces, in `ascii.js`:**
  - constants `RAMP` (`' .:-=+*#%@'`), `INK` (`'#39ff88'`), `PAPER` (`'#020604'`), `HOT` (`'#e9fff2'`) and `CELL_PX` (10);
  - `charFor(lum)` returns one `RAMP` character, clamping `lum` outside 0–1;
  - `gridFor(width, height, cell = CELL_PX)` returns `{ cols, rows }`, each at least 1;
  - `asciiRows(rgba, cols, rows, { mirror = false })` returns `string[]` from RGBA pixels, top row first, as `getImageData` gives them.
  - Both `charFor` and the world's shader pick the index as `min(9, floor(lum * 10))`.
- **Produces, in `camera.js`:**
  - `CAMERA_CONSTRAINTS` is `{ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } }`;
  - `cameraProblem(error)` returns the message to show;
  - `mirror` is the page's shared `{ video: HTMLVideoElement | null }`. The mirror UI sets it, and the ascii world reads it.

- [ ] **Step 1: Write the failing tests**

`tests/unit/ascii.test.js`:
```js
import { it, expect } from 'vitest';
import { RAMP, INK, PAPER, CELL_PX, charFor, gridFor, asciiRows } from '../../src/lib/ascii.js';

it('uses the spec’s ramp and colours', () => {
  expect(RAMP).toBe(' .:-=+*#%@');
  expect([INK, PAPER]).toEqual(['#39ff88', '#020604']);
  expect(CELL_PX).toBe(10);
});

it('maps brightness to the ramp, darkest first, clamping out-of-range values', () => {
  expect([0, 0.0999, 0.1, 0.5, 0.95, 1].map(charFor).join('')).toBe('  .+@@');
  expect(charFor(-1)).toBe(' ');
  expect(charFor(2)).toBe('@');
});

it('fits whole character cells into an area', () => {
  expect(gridFor(1440, 900)).toEqual({ cols: 144, rows: 90 });
  expect(gridFor(375, 812, 9)).toEqual({ cols: 41, rows: 90 });
  expect(gridFor(3, 3)).toEqual({ cols: 1, rows: 1 });
});

it('turns pixels into rows of characters, and mirrors them like a selfie', () => {
  const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 128, 128, 128, 255, 255, 255, 255, 255]);
  expect(asciiRows(rgba, 2, 2)).toEqual([' @', '+@']);
  expect(asciiRows(rgba, 2, 2, { mirror: true })).toEqual(['@ ', '@+']);
});
```

`tests/unit/camera.test.js`:
```js
import { it, expect } from 'vitest';
import { CAMERA_CONSTRAINTS, cameraProblem, mirror } from '../../src/lib/camera.js';

it('asks for the front camera’s video only, never audio', () => {
  expect(CAMERA_CONSTRAINTS.audio).toBe(false);
  expect(CAMERA_CONSTRAINTS.video.facingMode).toBe('user');
});

it('explains clearly why the camera didn’t start, and that the model stays', () => {
  const named = (name) => cameraProblem(Object.assign(new Error('x'), { name }));
  expect(named('NotAllowedError')).toMatch(/blocked/);
  expect(named('SecurityError')).toMatch(/blocked/);
  expect(named('NotFoundError')).toMatch(/No camera was found/);
  expect(named('NotReadableError')).toMatch(/busy/);
  expect(cameraProblem(null)).toMatch(/isn’t available in this browser/);
  for (const message of [named('NotAllowedError'), named('NotFoundError'), cameraProblem(null)]) expect(message).toMatch(/the model stays on screen/);
});

it('starts with no video shared', () => {
  expect(mirror.video).toBeNull();
});
```

Run: `npx vitest run tests/unit/ascii.test.js tests/unit/camera.test.js`
Expected: FAIL, because the modules don't exist yet.

- [ ] **Step 2: Implement `src/lib/ascii.js` and `src/lib/camera.js`**

`src/lib/ascii.js`:
```js
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
```

`src/lib/camera.js`:
```js
// The mirror's camera rules (spec §4.3 and §8.2): the front camera's video only, never audio; clear messages when it
// can't start; and one shared slot through which the mirror UI hands its <video> to the ascii world.
export const CAMERA_CONSTRAINTS = { audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } };

export function cameraProblem(error) {
  const name = error && error.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was blocked, so the model stays on screen. You can allow the camera for this site in your browser and try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found, so the model stays on screen.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is busy in another app, so the model stays on screen.';
  return 'The camera isn’t available in this browser, so the model stays on screen.';
}

// The page's one mirror: src/ui/mirror.js sets video while the camera is on; the ascii world draws it.
export const mirror = { video: null };
```

Run: `npx vitest run tests/unit/ascii.test.js tests/unit/camera.test.js`
Expected: PASS (7 tests).

Run: `npm test`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ascii.js src/lib/camera.js tests/unit/ascii.test.js tests/unit/camera.test.js
git commit -m "feat: add the ASCII ramp maths and the mirror's camera rules" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The ascii world

**Files:**
- Create: `src/worlds/lib/glyphs.js`, `src/worlds/ascii.js`, `tests/e2e/ascii-world.spec.js`
- Modify:
  - `src/worlds/names.js`;
  - `src/content/projects.js`: the ASCII Mirror's `world` and `worldOptions`;
  - `tests/e2e/picture.spec.js`: remove the cover-failure test.

**Interfaces:**
- **Consumes:**
  - from Task 1, `PARTS` and `partFor`, plus `pi-assembly.glb`;
  - from Task 2, `RAMP`, `INK`, `PAPER`, `HOT`, `CELL_PX`, `gridFor` and `mirror`;
  - the stage contract `create(ctx = { renderer, tier }, options)`, which returns `{ scene, camera, update, resize, dispose }`. If it throws, the chapter shows its poster.
  - `THREE.ColorManagement` is disabled globally, so hex colours pass through raw.
- **Produces:**
  - the default export `{ name: 'ascii', create }`, with options `{ model: url }` (required);
  - `WORLD_NAMES` includes `'ascii'`, and `WORLD_ASSETS.ascii` is `{ model: 'one' }`;
  - while `mirror.video` has frames, the world draws the webcam, mirrored, instead of the model;
  - `glyphAtlas(doc = document)` returns `Promise<THREE.CanvasTexture>`.

- [ ] **Step 1: Write the failing browser tests**

`tests/e2e/ascii-world.spec.js`:
```js
import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('the ASCII Mirror chapter runs its ASCII world', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#ascii-mirror')).toHaveAttribute('data-world', 'ascii');
  await scrollToId(page, 'ascii-mirror');
  await expect(page.locator('#ascii-mirror')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('if the Pi model fails to load, the chapter falls back to its poster and the others carry on', async ({ page }) => {
  await page.route('**/projects/ascii-mirror/pi-assembly.glb', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await expect(page.locator('#ascii-mirror')).toHaveClass(/is-failed/, { timeout: 30_000 });
  await expect.poll(() => page.locator('#ascii-mirror .scene__poster').evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
});

test('still mode renders the ASCII world for its poster', async ({ page }) => {
  await page.goto('./?still=ascii-mirror&p=0.85&tier=high');
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
  await expect(page.locator('#ascii-mirror')).toHaveAttribute('data-world', 'ascii');
});
```

Run: `npx playwright test tests/e2e/ascii-world.spec.js`
Expected: FAIL, because `data-world` is still `picture`.

- [ ] **Step 2: Write the glyph atlas**

`src/worlds/lib/glyphs.js`:
```js
import * as THREE from 'three';
import { RAMP } from '../../lib/ascii.js';

// A texture with the ramp's characters side by side, white on black, in the site's JetBrains Mono. Only weight 400
// is bundled. It waits for that font, so a poster never catches the fallback face.
export async function glyphAtlas(doc = document) {
  const font = '400 56px "JetBrains Mono"';
  if (doc.fonts) {
    try { await doc.fonts.load(font); } catch { /* the monospace fallback below still works */ }
  }
  const canvas = doc.createElement('canvas');
  canvas.width = 64 * RAMP.length;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#fff';
  g.font = `${font}, monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  [...RAMP].forEach((ch, i) => g.fillText(ch, i * 64 + 32, 34));
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}
```

- [ ] **Step 3: Implement `src/worlds/ascii.js`**

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RAMP, INK, PAPER, HOT, CELL_PX, gridFor } from '../lib/ascii.js';
import { PARTS, partFor } from '../lib/pi-parts.js';
import { mirror } from '../lib/camera.js';
import { glyphAtlas } from './lib/glyphs.js';

// The ASCII Mirror chapter (spec §4.3): Oscar's Pi 5 build, drawn as green ASCII. Each frame the model is rendered
// small, one pixel per character cell, and a full-screen pass swaps every cell for a ramp character by brightness.
// Scrolling explodes the stack. The printed camera mount is drawn with a green tint, which the pass shows as
// near-white characters. While the visitor's mirror is on (src/ui/mirror.js), the webcam feeds the same pass.

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tVideo;
uniform sampler2D tGlyphs;
uniform vec2 uGrid;
uniform float uUseVideo;
uniform vec2 uVideoScale;
uniform float uLevels;
uniform vec3 uInk;
uniform vec3 uHot;
uniform vec3 uPaper;
varying vec2 vUv;
void main() {
  vec2 cell = floor(vUv * uGrid);
  vec2 inCell = fract(vUv * uGrid);
  vec2 at = (cell + 0.5) / uGrid;
  float lum;
  float hot = 0.0;
  if (uUseVideo > 0.5) {
    vec2 v = (vec2(1.0 - at.x, at.y) - 0.5) * uVideoScale + 0.5; // mirrored like a selfie, cover-fitted
    lum = dot(texture2D(tVideo, v).rgb, vec3(0.2126, 0.7152, 0.0722));
  } else {
    vec4 s = texture2D(tScene, at);
    lum = max(s.r, max(s.g, s.b));
    hot = clamp((s.g - s.b) * 3.0, 0.0, 1.0); // only the mount is tinted green
  }
  float index = min(uLevels - 1.0, floor(lum * uLevels));
  float ink = texture2D(tGlyphs, vec2((index + inCell.x) / uLevels, inCell.y)).r;
  gl_FragColor = vec4(mix(uPaper, mix(uInk, uHot, hot), ink), 1.0);
}`;

export default {
  name: 'ascii',
  async create(stage, options = {}) {
    if (!options.model) throw new Error('the ascii world needs options.model');
    const [gltf, glyphs] = await Promise.all([new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(options.model), glyphAtlas()]);

    const grey = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, flatShading: true, roughness: 0.8, metalness: 0 });
    const tinted = new THREE.MeshStandardMaterial({ color: 0x66ff66, flatShading: true, roughness: 0.8, metalness: 0 });
    const parts = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const part = partFor(o.name);
      o.material = part && part.highlight ? tinted : grey;
      // Quantised parts carry their own position and scale, so the explode adds to the base position.
      if (part) parts.push({ object: o, base: o.position.clone(), offset: new THREE.Vector3(...part.explode) });
    });
    if (parts.length !== PARTS.length) throw new Error(`${options.model} has ${parts.length} of the ${PARTS.length} named parts`);

    const box = new THREE.Box3().setFromObject(gltf.scene);
    gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
    const model = new THREE.Group();
    model.rotation.x = -Math.PI / 2; // the CAD model is Z-up; three.js is Y-up, and the camera side then faces you
    model.scale.setScalar(2 / box.getSize(new THREE.Vector3()).length());
    model.add(gltf.scene);
    const pivot = new THREE.Group();
    pivot.add(model);
    pivot.rotation.set(0.45, -0.6, 0); // the pose at progress 0, so it doesn't swing round when the chapter opens

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(2, 3, 4);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.add(pivot, new THREE.HemisphereLight(0xffffff, 0x202020, 1.1), sun);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 4.2);

    const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    blank.needsUpdate = true;
    const uniforms = {
      tScene: { value: target.texture },
      tVideo: { value: blank },
      tGlyphs: { value: glyphs },
      uGrid: { value: new THREE.Vector2(1, 1) },
      uUseVideo: { value: 0 },
      uVideoScale: { value: new THREE.Vector2(1, 1) },
      uLevels: { value: RAMP.length },
      uInk: { value: new THREE.Color(INK) },
      uHot: { value: new THREE.Color(HOT) },
      uPaper: { value: new THREE.Color(PAPER) },
    };
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const quad = new THREE.Mesh(quadGeometry, quadMaterial);
    quad.frustumCulled = false;
    const screen = new THREE.Scene();
    screen.add(quad);
    const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const { renderer } = stage;
    let aspect = 1;
    let videoTexture = null;
    let videoFor = null;

    return {
      scene: screen,
      camera: flat,
      update({ progress, pointer }) {
        const video = mirror.video;
        if (video !== videoFor) {
          if (videoTexture) videoTexture.dispose();
          videoTexture = video ? new THREE.VideoTexture(video) : null;
          videoFor = video;
        }
        const live = Boolean(videoTexture && video.readyState >= 2 && video.videoWidth);
        uniforms.uUseVideo.value = live ? 1 : 0;
        uniforms.tVideo.value = live ? videoTexture : blank;
        if (live) {
          const videoAspect = video.videoWidth / video.videoHeight;
          uniforms.uVideoScale.value.set(Math.min(1, aspect / videoAspect), Math.min(1, videoAspect / aspect));
          return; // the webcam replaces the model: nothing to render into the target
        }
        const a = Math.min(1, progress / 0.7); // assembled at 0, fully exploded by 0.7
        const e = a * a * (3 - 2 * a);
        for (const part of parts) part.object.position.copy(part.base).addScaledVector(part.offset, e);
        const turn = -0.6 + progress * 1.1 + pointer.x * 0.25;
        const tilt = 0.45 + pointer.y * 0.12;
        pivot.rotation.y += (turn - pivot.rotation.y) * 0.08;
        pivot.rotation.x += (tilt - pivot.rotation.x) * 0.08;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
      },
      resize(width, height) {
        const { cols, rows } = gridFor(width, height, CELL_PX);
        target.setSize(cols, rows);
        uniforms.uGrid.value.set(cols, rows);
        aspect = width / height;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const halfW = halfH * aspect;
        pivot.scale.setScalar(Math.min(1, (halfW * 0.85) / 1.2, (halfH * 0.85) / 1.2));
        pivot.position.x = aspect > 1.2 ? halfW * 0.3 : 0; // keep the bottom-left title clear on wide screens
        pivot.position.y = aspect < 0.8 ? halfH * 0.25 : 0; // phones: above the title
      },
      dispose() {
        gltf.scene.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
        [grey, tinted, quadMaterial].forEach((m) => m.dispose());
        [target, glyphs, blank, quadGeometry].forEach((x) => x.dispose());
        if (videoTexture) videoTexture.dispose();
      },
    };
  },
};
```

- [ ] **Step 4: Register the world, switch the chapter, move the old cover test**

- **`src/worlds/names.js`:** add `'ascii'` to the end of `WORLD_NAMES`, and add `ascii: { model: 'one' },` to `WORLD_ASSETS`.
- **`src/content/projects.js`:** in the `ascii-mirror` entry, replace the `world` and `worldOptions` lines with:
  ```js
      world: 'ascii',
      worldOptions: { model: 'pi-assembly.glb' },
  ```
  Leave every other field as it is. `cover.webp` stays, because the entry's `media` still shows it.
- **`tests/e2e/picture.spec.js`:** delete the whole test `'a chapter whose cover fails falls back to its poster, and the others still work'`. No chapter uses the picture world any more, and the ascii world's model-failure test covers the same fallback. Keep `'every chapter world goes live'`.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all PASS. The registry test finds `src/worlds/ascii.js`, and `npm run check` prints `Content OK: 4 projects.`

Run: `npx playwright test tests/e2e/ascii-world.spec.js tests/e2e/picture.spec.js tests/e2e/site.spec.js tests/e2e/stage.spec.js`
Expected: all PASS.

- [ ] **Step 6: Look at it**

Write a throwaway Playwright script in this plan's SDD workspace `scratch/` folder, which is gitignored.
- **Server:** run it against `npx vite preview --port 4175 --strictPort` after `npm run build`.
- **Browser:** use `launch()` from `tools/lib/browser.mjs`, which gives Edge with SwiftShader.
- **Scroll position:** move to the ASCII chapter at a fraction `f` of its intro track:
  `top = section.getBoundingClientRect().top + scrollY + (section.querySelector('.scene__track').offsetHeight - innerHeight) * f`
- **Before each shot:** wait for `#ascii-mirror.is-live`, then about 3 s.
- **Shots:** 1440×900 with `?tier=high` at 0.1 and 0.8, and 375×812 at 0.1 and 0.8.

Stop the server and view the screenshots with the Read tool. Check that:
- the Pi build reads clearly as green ASCII characters from the ramp, on near-black;
- at 0.1 it is assembled, and at 0.8 it is exploded upward and forward, so each part is distinct;
- the camera mount's characters are near-white;
- the chapter title is readable;
- on the phone, the model sits above the title.

If something reads badly, tune only these, and say what you changed:
- `explode` in `PARTS`, but never the `node` names;
- the turn and tilt amounts;
- the fit factors and the lift in `resize`;
- the camera distance;
- the light intensities;
- the `0x66ff66` tint.

- [ ] **Step 7: Commit**

```bash
git add src/worlds/lib/glyphs.js src/worlds/ascii.js src/worlds/names.js src/content/projects.js tests/e2e/ascii-world.spec.js tests/e2e/picture.spec.js
git commit -m "feat: add the ascii world: the Pi build as green ASCII that explodes on scroll, mount highlighted" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The mirror

**Files:**
- Create: `src/ui/mirror.js`, `tests/e2e/mirror.spec.js`
- Modify: `src/app.js`, `src/styles/chapter.css`

**Interfaces:**
- **Consumes:**
  - from Task 2: `mirror`, `cameraProblem`, `CAMERA_CONSTRAINTS` and `asciiRows`;
  - from Task 3: the `ascii` world, which draws `mirror.video` while it has frames;
  - the chapter, `section#ascii-mirror.scene[data-world="ascii"]`, with `.scene__frame` and `.chapter__hook`.
- **Produces:**
  - `createMirror({ doc })` returns `null` when there is no ascii chapter. Otherwise it returns `{ start(), stop(), controls }`.
  - The DOM it builds:
    - `.mirror` (`role="group"`, `aria-label="Mirror"`), placed after the hook. It holds:
      - the button "Try the mirror";
      - "Camera on" (`.mirror__on`) and the "Stop" button, both shown only while the camera runs;
      - `.mirror__status` (`role="status"`).
    - `pre.mirror__ascii` (`aria-hidden`), prepended to `.scene__frame`. This is the text fallback. CSS hides it while the 3D world is live.

- [ ] **Step 1: Write the failing browser tests**

`tests/e2e/mirror.spec.js`:
```js
import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

// A stand-in camera: a bright disc moving on black, from a canvas stream. It records every getUserMedia request.
function fakeCamera({ fail } = {}) {
  window.__camera = { requests: [], streams: [] };
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const g = canvas.getContext('2d');
  let t = 0;
  setInterval(() => {
    t += 1;
    g.fillStyle = '#000';
    g.fillRect(0, 0, 320, 240);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(160 + 70 * Math.sin(t / 6), 120, 60, 0, Math.PI * 2);
    g.fill();
  }, 33);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    window.__camera.requests.push(constraints);
    if (fail) throw new DOMException('Permission denied', fail);
    const stream = canvas.captureStream(30);
    window.__camera.streams.push(stream);
    return stream;
  };
}
const tracks = (page) => page.evaluate(() => window.__camera.streams.map((s) => s.getVideoTracks()[0].readyState));

test('the camera starts only on a click, shows Camera on, and Stop turns it off', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await expect(chapter).toHaveClass(/is-live/, { timeout: 30_000 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__camera.requests.length)).toBe(0);
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.getByText('Camera on')).toBeVisible();
  const [constraints] = await page.evaluate(() => window.__camera.requests);
  expect(constraints.audio).toBe(false);
  expect(constraints.video).toBeTruthy();
  await expect(chapter.locator('.mirror__ascii')).toBeHidden(); // the 3D world draws the webcam itself
  expect(await tracks(page)).toEqual(['live']);
  await chapter.getByRole('button', { name: 'Stop' }).click();
  await expect(chapter.getByText('Camera on')).toBeHidden();
  expect(await tracks(page)).toEqual(['ended']);
  await expect(chapter.getByRole('button', { name: 'Try the mirror' })).toBeVisible();
});

test('scrolling away turns the camera off', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await page.locator('#ascii-mirror').getByRole('button', { name: 'Try the mirror' }).click();
  await expect(page.locator('#ascii-mirror').getByText('Camera on')).toBeVisible();
  await scrollToId(page, 'dead-tired');
  await expect.poll(() => tracks(page), { timeout: 5_000 }).toEqual(['ended']);
});

test('no frame leaves the page while the mirror runs', async ({ page }) => {
  await page.addInitScript(fakeCamera, {});
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await expect(page.locator('#ascii-mirror')).toHaveClass(/is-live/, { timeout: 30_000 });
  const origin = new URL(page.url()).origin;
  const sent = [];
  page.on('request', (r) => { if (r.method() !== 'GET' || !r.url().startsWith(origin)) sent.push(`${r.method()} ${r.url()}`); });
  page.on('websocket', (ws) => sent.push(`websocket ${ws.url()}`));
  await page.locator('#ascii-mirror').getByRole('button', { name: 'Try the mirror' }).click();
  await expect(page.locator('#ascii-mirror').getByText('Camera on')).toBeVisible();
  await page.waitForTimeout(2_000);
  expect(sent).toEqual([]);
});

test('a blocked camera shows a clear message, and the model stays on screen', async ({ page }) => {
  await page.addInitScript(fakeCamera, { fail: 'NotAllowedError' });
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  const chapter = page.locator('#ascii-mirror');
  await expect(chapter).toHaveClass(/is-live/, { timeout: 30_000 });
  await chapter.getByRole('button', { name: 'Try the mirror' }).click();
  await expect(chapter.locator('.mirror__status')).toContainText('blocked');
  await expect(chapter.getByText('Camera on')).toBeHidden();
  await expect(chapter).toHaveClass(/is-live/);
});

test('a browser with no camera support says so', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }));
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await page.locator('#ascii-mirror').getByRole('button', { name: 'Try the mirror' }).click();
  await expect(page.locator('#ascii-mirror .mirror__status')).toContainText('isn’t available');
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the mirror still works, drawn as text over the poster, once clicked', async ({ page }) => {
    await page.addInitScript(fakeCamera, {});
    await page.goto('./');
    await scrollToId(page, 'ascii-mirror');
    await page.waitForTimeout(1_000);
    await expect(page.locator('html')).not.toHaveClass(/webgl/);
    const chapter = page.locator('#ascii-mirror');
    await expect(chapter.locator('.mirror__ascii')).toBeHidden();
    await chapter.getByRole('button', { name: 'Try the mirror' }).click();
    const text = chapter.locator('.mirror__ascii');
    await expect(text).toBeVisible();
    await expect.poll(() => text.textContent(), { timeout: 5_000 }).toMatch(/@/);
    const first = await text.textContent();
    await expect.poll(() => text.textContent(), { timeout: 5_000 }).not.toBe(first);
  });
});
```

Run: `npx playwright test tests/e2e/mirror.spec.js`
Expected: every test FAILS, because there's no "Try the mirror" button yet.

- [ ] **Step 2: Implement `src/ui/mirror.js`**

```js
import { mirror, cameraProblem, CAMERA_CONSTRAINTS } from '../lib/camera.js';
import { asciiRows } from '../lib/ascii.js';

const TEXT_PX = 12; // the text fallback's character size; JetBrains Mono's characters are 0.6 em wide

// "Try the mirror" (spec §4.3): an opt-in webcam drawn by the ASCII pass.
// - It starts only on a click, and asks for video only.
// - While it runs, "Camera on" and a Stop button show.
// - It stops by itself when the chapter leaves the screen, the tab is hidden or the page closes.
// - Frames never leave the browser. The <video> is drawn only into the page: by the ascii world, or by the text
//   fallback below when no 3D world is drawing. Nothing is sent, stored or recorded.
export function createMirror({ doc }) {
  const chapter = doc.querySelector('.scene[data-world="ascii"]');
  if (!chapter) return null;
  const win = doc.defaultView;
  const frame = chapter.querySelector('.scene__frame');
  const make = (tag, className, text = '') => {
    const el = doc.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  };

  const controls = make('div', 'mirror');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Mirror');
  const startButton = make('button', 'mirror__start', 'Try the mirror');
  const indicator = make('span', 'mirror__on', 'Camera on');
  const stopButton = make('button', 'mirror__stop', 'Stop');
  const status = make('p', 'mirror__status');
  startButton.type = 'button';
  stopButton.type = 'button';
  status.setAttribute('role', 'status');
  indicator.hidden = true;
  stopButton.hidden = true;
  controls.append(startButton, indicator, stopButton, status);
  chapter.querySelector('.chapter__hook').after(controls);

  const text = make('pre', 'mirror__ascii');
  text.setAttribute('aria-hidden', 'true');
  text.hidden = true;
  frame.prepend(text);

  const video = doc.createElement('video');
  video.muted = true;
  video.playsInline = true;
  const sample = doc.createElement('canvas');
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });

  let stream = null;
  let wanted = false;
  let raf = 0;

  // With no 3D world drawing the chapter, draw the webcam as text. CSS hides this element while the 3D world is
  // live, and then it is skipped here (offsetParent is null).
  function drawText() {
    raf = win.requestAnimationFrame(drawText);
    if (text.offsetParent === null || video.readyState < 2 || !video.videoWidth) return;
    const cols = Math.max(1, Math.floor(frame.clientWidth / (TEXT_PX * 0.6)));
    const rows = Math.max(1, Math.floor(frame.clientHeight / TEXT_PX));
    if (sample.width !== cols || sample.height !== rows) {
      sample.width = cols;
      sample.height = rows;
    }
    const gridAspect = (cols * 0.6) / rows; // cover-fit the video into the grid
    let sw = video.videoWidth;
    let sh = video.videoHeight;
    if (sw / sh > gridAspect) sw = sh * gridAspect;
    else sh = sw / gridAspect;
    sampleCtx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
    text.textContent = asciiRows(sampleCtx.getImageData(0, 0, cols, rows).data, cols, rows, { mirror: true }).join('\n');
  }

  function show(on) {
    startButton.hidden = on;
    indicator.hidden = !on;
    stopButton.hidden = !on;
    text.hidden = !on;
    chapter.classList.toggle('is-mirroring', on);
    if (!on) text.textContent = '';
  }

  function stop() {
    wanted = false;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    mirror.video = null;
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    status.textContent = '';
    show(false);
  }

  async function start() {
    status.textContent = '';
    const devices = win.navigator.mediaDevices;
    if (!devices || typeof devices.getUserMedia !== 'function') {
      status.textContent = cameraProblem(null);
      return;
    }
    wanted = true;
    startButton.disabled = true;
    try {
      const got = await devices.getUserMedia(CAMERA_CONSTRAINTS);
      if (!wanted) { // stopped while the browser was still asking
        got.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = got;
      video.srcObject = stream;
      await video.play().catch(() => {});
      mirror.video = video;
      show(true);
      status.textContent = 'The picture stays in your browser: nothing is sent or saved.';
      raf = win.requestAnimationFrame(drawText);
    } catch (err) {
      stop();
      status.textContent = cameraProblem(err);
    } finally {
      startButton.disabled = false;
    }
  }

  startButton.addEventListener('click', start);
  stopButton.addEventListener('click', () => {
    stop();
    startButton.focus();
  });
  // The camera never stays on behind your back.
  if ('IntersectionObserver' in win) {
    new win.IntersectionObserver(([entry]) => { if (!entry.isIntersecting && wanted) stop(); }).observe(chapter);
  }
  doc.addEventListener('visibilitychange', () => { if (doc.hidden && wanted) stop(); });
  win.addEventListener('pagehide', () => { if (wanted) stop(); });
  return { start, stop, controls };
}
```

In `src/app.js`:
- after `import { createLightShow } from './ui/light-show.js';`, add `import { createMirror } from './ui/mirror.js';`;
- directly after the existing guarded `createLightShow` block, add:
  ```js
    try { createMirror({ doc }); } catch (err) { console.error('[mirror] the mirror failed to start; the rest of the page carries on.', err); }
  ```

Append to `src/styles/chapter.css`:
```css
.mirror { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 22px; }
.mirror [hidden], .mirror__ascii[hidden] { display: none !important; }
.mirror button { padding: 9px 16px; border: 1px solid var(--faint); border-radius: 999px; background: rgba(2, 6, 4, 0.6); color: var(--paper); font: 500 12px/1 var(--font-mono); letter-spacing: 0.04em; cursor: pointer; }
.mirror button:hover { border-color: var(--paper); }
.mirror__start { border-color: #39ff88 !important; color: #39ff88 !important; }
.mirror__on { display: inline-flex; align-items: center; gap: 8px; color: #ff8080; font: 500 12px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
.mirror__on::before { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #ff3b3b; box-shadow: 0 0 8px #ff3b3b; }
.mirror__status { flex-basis: 100%; margin: 0; max-width: 52ch; color: var(--muted); font-size: 14px; }
.mirror__status:empty { display: none; }
.mirror__ascii { position: absolute; inset: 0; z-index: -1; margin: 0; overflow: hidden; background: #020604; color: #39ff88; font: 400 12px/1 var(--font-mono); white-space: pre; pointer-events: none; }
html.webgl .scene.is-live .mirror__ascii { display: none; }
```

- [ ] **Step 3: Run the tests**

Run: `npx playwright test tests/e2e/mirror.spec.js tests/e2e/ascii-world.spec.js tests/e2e/site.spec.js tests/e2e/stage.spec.js`
Expected: all PASS. `site.spec.js` includes the 375 px no-sideways-scrolling check.

Run: `npm test`
Expected: all PASS.

- [ ] **Step 4: Look at it**

Adapt your Task 3 scratch script. Before navigating, give the page the same `fakeCamera` init script the tests use. Take three shots:
- **1440×900, `?tier=high`:** click "Try the mirror" and wait 2 s. The 3D world should draw the moving disc as mirrored ASCII, with "Camera on" and Stop visible under the hook.
- **The same, at 375×812.**
- **With `reducedMotion: 'reduce'`:** click, wait 2 s. The text fallback should cover the poster in green characters, and the title should stay readable over it.

If the fallback hides the title, lower its opacity or give it a scrim, using CSS only.

- [ ] **Step 5: Commit**

```bash
git add src/ui/mirror.js src/app.js src/styles/chapter.css tests/e2e/mirror.spec.js
git commit -m "feat: add the opt-in webcam mirror, drawn through the ASCII pass, with a text fallback" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<!-- PART B: Tasks 5-8 -->
