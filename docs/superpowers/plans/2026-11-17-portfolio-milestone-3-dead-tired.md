# Portfolio Milestone 3 (DEAD TIRED world) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the DEAD TIRED chapter its own "exploded print" world, in which the tee's real Photoshop layers float apart in 3D and slide together into the finished print as you scroll. First, fix the poster race parked from milestone 2.

**Architecture:**
- **Poster fix.** A world may now expose an optional `ready` promise for background assets. Still mode (used for posters) awaits it, and HALCYON's panels use it.
- **Layer stack.** A publish tool crops each of the nine layer PNGs to its content, writes small WebPs, and records each layer's box on the 4193×4801 canvas in a `layers.json` manifest. A pure parser validates that manifest at runtime and in tests.
- **New world.** The generic `layers` world reads any such manifest. It draws one plane per layer at its exact position, spreads the planes out along Z and turns the stack at progress 0, then compresses them flat and face-on by progress 0.7. The pointer tilts the stack, and bone and red ink dust drifts around it on the shirt colour.
- **Reusable.** The world is named `layers`, not `dead-tired`, so a future Photoshop project can reuse it with its own manifest.

**Tech Stack:** Milestones 1–2's stack (Vite 6.4.1, three.js 0.181.0, Lenis 1.3.11, Vitest 3.2.4, Playwright 1.61.1 on Microsoft Edge, sharp 0.32.6, ffmpeg-static 5.2.0). There are no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-16-portfolio-design.md` (§4.5 for the DEAD TIRED world; §8 for the quality bars)

**Builds on:** `main` at `1ecc231` (milestones 1 and 2 merged). `CLAUDE.md` explains the current code.

**Deliberate differences from the spec, all within milestone scope:**
- The spec says the 9 layer PNGs become textured planes.
  - The shirt layer is one solid colour (#161616), so it is drawn as a plain colour plane instead of a 4193×4801 texture.
  - The other eight layers are cropped to their content, about 6× fewer pixels on the GPU.
  - Thin bone-coloured edges show each layer while the stack is apart, so the shirt plane can still be seen against the same-coloured background. They fade out as the layers compress.

## Global Constraints

- **Node:** must run on Node 18.16.0 (this PC) and Node 20 (CI).
- **No new dependencies:** keep every pinned version exactly as it is.
- **Playwright browser:** Playwright drives the installed Microsoft Edge (`channel: 'msedge'`) with SwiftShader WebGL.
- **The repo will be public.** No file or commit message may contain Oscar's surname, school, state, assignment name or any email address. The only name shown is "Oscar". `tests/unit/privacy.test.js` must keep passing.
- **Git identity:** commit with the existing global git identity. Never change git config.
- **No pushing:** do not push and do not create a remote. Publishing is milestone 6.
- **No third parties:** the built site makes no requests to third-party hosts.
- **Look:** dark only. The DEAD TIRED world uses bone `#bca775` and red `#8c1f25` ink dust on `#161616` (spec §4.5), and the chapter title stays in Big Shoulders Display.
- **Base path and escaping:** every URL written into HTML goes through `withBase()` with `BASE` from `site.config.js`, and every attribute value goes through `escapeHtml()`.
- **Never commit:** `raw/`, `sources.local.json`, `privacy.local.json` or `screens/`.
- **Media:** published images are WebP with no EXIF, XMP or IPTC metadata. `npm test` enforces this.
- **Commit messages:** every one ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pass it as a second `-m`.
- **Working directory and branch:** all commands run from `C:\Users\Oscar\Downloads\portfolio` in Git Bash, on the branch `milestone-3-dead-tired` (cut from `main` when execution starts).
- **Dev server and git:** stop any running dev server before switching branches, because Windows file locks block `git checkout`.

## Review Focus

1. **A layer image that fails to load** should make the DEAD TIRED chapter fall back to its poster (the finished print), not show a stack with a hole in it. The other chapters keep working. Task 3's browser test covers this.
2. **A malformed or hand-edited `layers.json`** in a future project should throw a clear error that names the bad layer, and that chapter should fall back to its poster. Task 2's unit tests cover this.
3. **HALCYON's poster rendered while one of its panel screenshots is slow** should wait for the panel instead of saving a poster without it. Task 1's browser test covers this.
4. **A manifest layer whose file name points outside its folder** (such as `../x.webp`) should be rejected, so a world only ever loads files that sit beside its manifest. Task 2's unit test covers this.
5. **Layer images published at a different scale from the boxes in the manifest** would misalign the stack. A test should catch this by checking each published image's shape against its box. Task 2's unit test covers this.

---

## File Structure

```
src/app.js                          MOD  renderStill awaits a world's optional `ready`
src/worlds/halcyon.js               MOD  exposes `ready` (panels settled); .catch on panel attach
src/lib/layer-manifest.js           NEW  pure: parseLayerManifest(json)
tools/publish-layers.mjs            NEW  crop the layer PNGs → WebP + layers.json
src/worlds/layers.js                NEW  the "exploded print" world (any layers.json)
src/worlds/names.js                 MOD  + 'layers' in WORLD_NAMES; WORLD_ASSETS.layers = { manifest: 'one' }
src/content/projects.js             MOD  DEAD TIRED uses world 'layers'
tools/publish-media.mjs             MOD  drop the unused DEAD TIRED cover job
package.json                        MOD  + "layers:dead-tired" script; media chain runs it
public/projects/dead-tired/layers/  NEW  (generated, committed) 8 WebPs + layers.json
public/projects/dead-tired/cover.webp       DELETE
public/posters/*.webp               REGENERATED
tests/unit/layer-manifest.test.js   NEW
tests/e2e/halcyon-world.spec.js     MOD  + still-mode-waits test
tests/e2e/dead-tired-world.spec.js  NEW
CLAUDE.md                           MOD  world interface `ready`, status, commands
```

---

### Task 1: Still mode waits for a world's background assets

**Files:**
- Modify: `src/app.js` (`renderStill`), `src/worlds/halcyon.js` (panel loading and the returned object), `CLAUDE.md` (world interface)
- Test: `tests/e2e/halcyon-world.spec.js`

**Interfaces:**
- Consumes: `stage.whenReady(index)` (M1), which resolves to the world object.
- Produces:
  - World interface addition: an optional `ready: Promise<void>`. It resolves once a world's optional background assets have settled, and it never rejects.
  - `renderStill` awaits `world.ready` when present, before its warm-up frames.
  - HALCYON's `ready` resolves when every panel has attached or failed.

- [ ] **Step 1: Write the failing browser test**

Append to `tests/e2e/halcyon-world.spec.js`:
```js
test('still mode waits for slow background panels before it reports ready', async ({ page }) => {
  test.setTimeout(150_000); // the 12 s delay plus a full still render can pass the 90 s default
  let released = false;
  await page.route('**/projects/halcyon-somatics/shot-terms-900.webp', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 12_000)); // a very slow panel
    released = true;
    await route.continue();
  });
  // Don't wait for `load`: a slow image that starts before it would hold `load` back, and `goto` would hide the bug.
  await page.goto('./?still=halcyon-somatics&p=0.85&tier=high', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 80_000 });
  expect(released).toBe(true);
});
```

Run: `npx playwright test tests/e2e/halcyon-world.spec.js -g "slow background panels"`
Expected: FAIL. `released` is still `false` when `data-still-ready` becomes `'1'`, because still mode doesn't wait for panels yet.

- [ ] **Step 2: Make HALCYON expose `ready`**

In `src/worlds/halcyon.js`, replace the whole `(options.panels || []).slice(0, PANEL_LAYOUT.length).forEach((url, i) => { ... });` block with:
```js
    // Panels are decoration: they load in the background and attach as they arrive; one that fails is skipped.
    // `ready` settles once every panel has attached or failed, so still mode (posters) can wait for them.
    const panelLoads = (options.panels || []).slice(0, PANEL_LAYOUT.length).map((url, i) =>
      loadPanelTexture(url)
        .then((loaded) => {
          const panel = makePanel(loaded);
          if (disposed) { panel.dispose(); return; }
          const at = PANEL_LAYOUT[i];
          panel.group.position.set(at.x, at.y, at.z);
          panel.group.rotation.y = at.ry;
          panel.layout = at;
          panels.push(panel);
          panelGroup.add(panel.group);
        })
        .catch((err) => console.warn(`[halcyon] panel ${url} failed to load; skipping it.`, err)));
    const ready = Promise.allSettled(panelLoads).then(() => undefined);
```
In the returned object, add `ready,` on the line after `camera,`.

- [ ] **Step 3: Make still mode wait for it**

In `src/app.js` `renderStill`, replace:
```js
  try { await stage.whenReady(index); } catch { html.dataset.stillReady = 'error'; return; }
```
with:
```js
  let world;
  try { world = await stage.whenReady(index); } catch { html.dataset.stillReady = 'error'; return; }
  if (world && world.ready) await world.ready; // e.g. HALCYON's background panels; never rejects
```

- [ ] **Step 4: Document it in CLAUDE.md**

In CLAUDE.md's world interface code block, change the `return { scene, camera, update(...) ... };` line to:
```js
    return { scene, camera, ready /* optional */, update({ time, delta, progress, pointer, tier }) {}, resize(width, height, dpr) {}, dispose() {} };
```
Then add this sentence after the paragraph that follows the block: "`ready` is optional: a promise that settles (and never rejects) once background extras such as HALCYON's panels have loaded. Still mode waits for it, so posters include them."

- [ ] **Step 5: Run the tests**

Run: `npx playwright test tests/e2e/halcyon-world.spec.js`
Expected: all 5 PASS.

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app.js src/worlds/halcyon.js CLAUDE.md tests/e2e/halcyon-world.spec.js
git commit -m "fix: still mode waits for a world's background assets, so HALCYON's poster keeps its panels" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Publish the DEAD TIRED layer stack

**Files:**
- Create: `src/lib/layer-manifest.js`, `tools/publish-layers.mjs`, `tests/unit/layer-manifest.test.js`
- Modify: `package.json` (add `layers:dead-tired`; the `media` chain runs it)
- Generated and committed: `public/projects/dead-tired/layers/*.webp` (8 files) and `public/projects/dead-tired/layers/layers.json`

**Interfaces:**
- Consumes: `raw/tee/layers/*.png` (gitignored; copied there by `tools/copy-sources.mjs` in M1). These are nine 4193×4801 full-canvas layer exports named `00 SHIRT.png` … `08 BATTERY CELL.png`, back to front.
- Produces:
  - **The parser:** `parseLayerManifest(json)` returns `{ width, height, layers: { name, file?, fill?, x, y, w, h }[] }`. It throws an `Error` naming the problem.
    - Each layer has exactly one of `file` (a bare `.webp` file name, with no `/` or `\`) or `fill` (a `#rrggbb` colour).
    - Each box is in canvas pixels and sits inside the canvas.
    - Layers are back to front.
  - **The manifest file:** `public/projects/dead-tired/layers/layers.json` has `width` 4193 and `height` 4801. Layer 1 is `{ name: 'SHIRT', fill: <its colour> }`, covering the canvas, followed by eight file layers.

- [ ] **Step 1: Write the failing parser tests**

`tests/unit/layer-manifest.test.js`:
```js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseLayerManifest } from '../../src/lib/layer-manifest.js';

const valid = () => ({
  width: 100,
  height: 200,
  layers: [
    { name: 'backdrop', fill: '#161616', x: 0, y: 0, w: 100, h: 200 },
    { name: 'title', file: 'title.webp', x: 10, y: 20, w: 80, h: 40 },
  ],
});

describe('parseLayerManifest', () => {
  it('returns the canvas size and layers back to front', () => {
    const m = parseLayerManifest(valid());
    expect(m.width).toBe(100);
    expect(m.layers.map((l) => l.name)).toEqual(['backdrop', 'title']);
    expect(m.layers[0]).toEqual({ name: 'backdrop', fill: '#161616', x: 0, y: 0, w: 100, h: 200 });
    expect(m.layers[1]).toEqual({ name: 'title', file: 'title.webp', x: 10, y: 20, w: 80, h: 40 });
  });
  it('rejects a missing canvas size or an empty layer list', () => {
    expect(() => parseLayerManifest({ ...valid(), width: 0 })).toThrow(/width and height/);
    expect(() => parseLayerManifest({ ...valid(), layers: [] })).toThrow(/at least one layer/);
    expect(() => parseLayerManifest(null)).toThrow(/must be an object/);
  });
  it('needs exactly one of file or fill, and names the layer', () => {
    const both = valid(); both.layers[1].fill = '#ffffff';
    expect(() => parseLayerManifest(both)).toThrow(/layer 2 \(title\): needs exactly one of "file"/);
    const neither = valid(); delete neither.layers[1].file;
    expect(() => parseLayerManifest(neither)).toThrow(/layer 2 \(title\): needs exactly one of "file"/);
    const badFill = valid(); badFill.layers[0].fill = 'grey';
    expect(() => parseLayerManifest(badFill)).toThrow(/layer 1 \(backdrop\)/);
  });
  it('only accepts bare .webp file names, so worlds load files beside their manifest', () => {
    for (const file of ['../x.webp', 'sub/x.webp', 'a\\x.webp', 'x.png']) {
      const m = valid(); m.layers[1].file = file;
      expect(() => parseLayerManifest(m)).toThrow(/needs exactly one of "file"/);
    }
  });
  it('rejects boxes outside the canvas', () => {
    const m = valid(); m.layers[1].x = 30; // 30 + 80 > 100
    expect(() => parseLayerManifest(m)).toThrow(/box must sit inside the 100x200 canvas/);
    const n = valid(); n.layers[1].w = 0;
    expect(() => parseLayerManifest(n)).toThrow(/box must sit inside/);
  });
});
```

Run: `npx vitest run tests/unit/layer-manifest.test.js`
Expected: FAIL, because `src/lib/layer-manifest.js` doesn't exist yet.

- [ ] **Step 2: Implement `src/lib/layer-manifest.js`**

```js
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
```

Run: `npx vitest run tests/unit/layer-manifest.test.js`
Expected: PASS.

- [ ] **Step 3: Write `tools/publish-layers.mjs` and run it**

```js
// Crops each DEAD TIRED layer PNG (full 4193x4801 canvas) to its content, saves it as a small WebP,
// and records where it sits in layers.json. A fully opaque layer (the shirt) is recorded as a flat colour.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'raw/tee/layers';
const OUT = 'public/projects/dead-tired/layers';
const SCALE = 0.3; // published pixels per canvas pixel
const slug = (file) => file.replace(/\.png$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hex = (values) => `#${values.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const files = (await fs.readdir(SRC)).filter((f) => f.toLowerCase().endsWith('.png')).sort();
let width;
let height;
const layers = [];
for (const file of files) {
  const src = path.join(SRC, file);
  const meta = await sharp(src).metadata();
  width ??= meta.width;
  height ??= meta.height;
  if (meta.width !== width || meta.height !== height) throw new Error(`${file} is ${meta.width}x${meta.height}, expected ${width}x${height}`);
  const name = file.replace(/^\d+\s*/, '').replace(/\.png$/i, '');
  const stats = await sharp(src).stats();
  if (stats.isOpaque) {
    layers.push({ name, fill: hex(stats.channels.slice(0, 3).map((c) => c.mean)), x: 0, y: 0, w: width, h: height });
    console.log(`${file}: flat colour ${layers.at(-1).fill}`);
    continue;
  }
  const { info } = await sharp(src).trim().toBuffer({ resolveWithObject: true });
  const box = { x: -info.trimOffsetLeft, y: -info.trimOffsetTop, w: info.width, h: info.height };
  const out = `${slug(file)}.webp`;
  await sharp(src)
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .resize({ width: Math.max(1, Math.round(box.w * SCALE)) })
    .webp({ quality: 86, alphaQuality: 90, effort: 5 })
    .toFile(path.join(OUT, out));
  layers.push({ name, file: out, ...box });
  console.log(`${file}: ${out} at ${box.x},${box.y} (${box.w}x${box.h})`);
}
await fs.writeFile(path.join(OUT, 'layers.json'), `${JSON.stringify({ width, height, layers }, null, 2)}\n`);
console.log(`wrote ${OUT}/layers.json (${layers.length} layers)`);
```

In `package.json` `"scripts"`:
- add `"layers:dead-tired": "node tools/publish-layers.mjs"`;
- in the `"media"` script, insert ` && node tools/publish-layers.mjs` immediately before ` && node tools/check-media.mjs`.

Run: `npm run layers:dead-tired && npm run check:media`
Expected:
- one line per layer;
- `00 SHIRT.png: flat colour #161616`, or a near-black colour very close to it;
- eight WebPs in `public/projects/dead-tired/layers/`;
- the metadata check passes.

- [ ] **Step 4: Test the real manifest and images**

Append to `tests/unit/layer-manifest.test.js`:
```js
describe('the published DEAD TIRED layer stack', () => {
  const dir = 'public/projects/dead-tired/layers';
  const manifest = parseLayerManifest(JSON.parse(fs.readFileSync(path.join(dir, 'layers.json'), 'utf8')));

  it('is the full 4193x4801 canvas: the shirt as a flat colour, then eight image layers', () => {
    expect([manifest.width, manifest.height]).toEqual([4193, 4801]);
    expect(manifest.layers[0]).toMatchObject({ name: 'SHIRT', x: 0, y: 0, w: 4193, h: 4801 });
    expect(manifest.layers[0].fill).toMatch(/^#[0-9a-f]{6}$/);
    expect(manifest.layers.filter((l) => l.file)).toHaveLength(8);
  });

  it('has every image, each shaped like its box (so the stack lines up)', async () => {
    for (const layer of manifest.layers.filter((l) => l.file)) {
      const file = path.join(dir, layer.file);
      expect(fs.existsSync(file), layer.file).toBe(true);
      const { width, height } = await sharp(file).metadata();
      expect(Math.abs(width / height - layer.w / layer.h), layer.file).toBeLessThan(0.05 * (layer.w / layer.h) + 0.02);
    }
  });
});
```
- The aspect tolerance allows for the battery cell, which is only 11×16 published pixels.
- The test doesn't require alpha. The battery cell is solid inside its tight crop, so sharp writes it without an alpha channel, and that is correct.

A dry run on the real layers (17 Nov) gave these results, so expect the same:

| Layer | Published size | Box (x, y, w×h) |
|---|---|---|
| SHIRT | flat `#161616` | 0, 0, 4193×4801 |
| 01 title outline, DEAD | 1101×494 | 267, 196, 3671×1647 |
| 02 title outline, TIRED | 1124×457 | 197, 2610, 3746×1524 |
| 03 title solid, DEAD | 1093×486 | 281, 566, 3643×1619 |
| 04 title solid, TIRED | 1115×449 | 211, 2295, 3718×1496 |
| 05 ground | 403×114 | 1736, 3805, 1343×381 |
| 06 skeleton | 416×994 | 1421, 937, 1388×3316 |
| 07 bottom bar | 1138×54 | 200, 4372, 3794×181 |
| 08 battery cell | 11×16 | 1997, 4474, 37×53 |

The eight files total about 560 KB.

Run: `npx vitest run tests/unit/layer-manifest.test.js && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/layer-manifest.js tools/publish-layers.mjs package.json public/projects/dead-tired/layers tests/unit/layer-manifest.test.js
git commit -m "feat: publish the DEAD TIRED layer stack as cropped WebPs with a manifest" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The "exploded print" world

**Files:**
- Create: `src/worlds/layers.js`, `tests/e2e/dead-tired-world.spec.js`
- Modify: `src/worlds/names.js` (add `'layers'` and its `WORLD_ASSETS` entry), `src/content/projects.js` (DEAD TIRED's `world` and `worldOptions`)

**Interfaces:**
- Consumes:
  - `parseLayerManifest` and the published manifest (Task 2); `mulberry32` and `particleCount`.
  - The stage contract `create(ctx = { renderer, tier }, options)` → `{ scene, camera, update, resize, dispose }`. A throw falls back to the poster.
  - `THREE.ColorManagement` is disabled globally, so hex colours and textures pass through raw.
- Produces:
  - `WORLD_NAMES` includes `'layers'`, and `WORLD_ASSETS.layers = { manifest: 'one' }`.
  - The default export `{ name: 'layers', create }`.
  - Options: `{ manifest: url (required), palette?: string[] hex (the dust colours), background?: hex }`. `palette` is the option name the picture world already uses, and `validate.js` already checks that it is a list of `#rrggbb` colours.
  - It throws if the manifest is missing, malformed or any layer image fails to load.

- [ ] **Step 1: Write the failing browser test**

`tests/e2e/dead-tired-world.spec.js`:
```js
import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('the DEAD TIRED chapter runs the exploded-print world', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#dead-tired')).toHaveAttribute('data-world', 'layers');
  await scrollToId(page, 'dead-tired');
  await expect(page.locator('#dead-tired')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('a missing layer makes the chapter fall back to its poster, not a stack with a hole', async ({ page }) => {
  await page.route('**/projects/dead-tired/layers/06-skeleton.webp', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'dead-tired');
  await expect(page.locator('#dead-tired')).toHaveClass(/is-failed/, { timeout: 30_000 });
  await expect.poll(() => page.locator('#dead-tired .scene__poster').evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
});

test('still mode renders the exploded-print world for its poster', async ({ page }) => {
  await page.goto('./?still=dead-tired&p=0.85&tier=high');
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
});
```

Run: `npx playwright test tests/e2e/dead-tired-world.spec.js`
Expected: FAIL, because `data-world` is still `picture`.

- [ ] **Step 2: Implement `src/worlds/layers.js`**

```js
import * as THREE from 'three';
import { mulberry32 } from '../lib/rng.js';
import { particleCount } from '../lib/tier.js';
import { parseLayerManifest } from '../lib/layer-manifest.js';

// An "exploded print": a design's layers float apart along Z and slide together into the finished piece.
const STACK_HEIGHT = 2.0; // world units for the full canvas height
const SPREAD = 0.24; // gap between neighbouring layers when fully exploded (larger pushes the front layers into the camera)
const DEFAULT_DUST = ['#bca775', '#8c1f25'];
const HEX = /^#[0-9a-f]{6}$/i;

const dustVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float t = uTime * 0.12 + aSeed * 6.2831;
  p.y = mod(p.y + uTime * (0.03 + aSeed * 0.05) + 1.6, 3.2) - 1.6; // slow upward drift, wrapping
  p.x += sin(t) * 0.08;
  p.z += cos(t * 0.8) * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.5 + aSeed * 2.5) * uScale;
  vColor = aColor;
  vAlpha = 0.25 + aSeed * 0.5;
}`;

const dustFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  gl_FragColor = vec4(vColor, vAlpha * (1.0 - smoothstep(0.0, 0.25, r)));
}`;

async function loadManifest(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not load ${url} (${response.status})`);
  return parseLayerManifest(await response.json());
}

async function loadTexture(url) {
  const texture = await new THREE.TextureLoader().loadAsync(url);
  texture.anisotropy = 4;
  return texture;
}

export default {
  name: 'layers',
  async create(stage, options = {}) {
    if (!options.manifest) throw new Error('the layers world needs options.manifest');
    const manifest = await loadManifest(options.manifest);
    const folder = options.manifest.slice(0, options.manifest.lastIndexOf('/') + 1);
    // Every layer is part of the design: if one fails, the whole world fails and the poster shows the finished print.
    const textures = await Promise.all(manifest.layers.map((layer) => (layer.file ? loadTexture(folder + layer.file) : null)));

    const k = STACK_HEIGHT / manifest.height;
    const stack = new THREE.Group();
    stack.rotation.set(0.18, -0.6, 0); // start in the exploded pose, so the stack doesn't swing round when the chapter opens
    const edgeMaterial = new THREE.LineBasicMaterial({ color: '#bca775', transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    // Image layers draw strictly back to front (renderOrder, no depth test), so co-planar layers never z-fight when compressed.
    // Flat-colour layers (the shirt) are opaque and do write depth, so dust behind the shirt is hidden while dust in front shows.
    const parts = manifest.layers.map((layer, i) => {
      const geometry = new THREE.PlaneGeometry(layer.w * k, layer.h * k);
      const material = layer.file
        ? new THREE.MeshBasicMaterial({ map: textures[i], transparent: true, depthTest: false, depthWrite: false })
        : new THREE.MeshBasicMaterial({ color: layer.fill });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = i * 2;
      const edges = new THREE.EdgesGeometry(geometry);
      const outline = new THREE.LineSegments(edges, edgeMaterial);
      outline.renderOrder = i * 2 + 1;
      const layerGroup = new THREE.Group();
      layerGroup.position.set((layer.x + layer.w / 2 - manifest.width / 2) * k, -(layer.y + layer.h / 2 - manifest.height / 2) * k, 0);
      layerGroup.add(mesh, outline);
      stack.add(layerGroup);
      return { group: layerGroup, geometry, material, edges, texture: textures[i] };
    });
    const mid = (parts.length - 1) / 2;

    const palette = (Array.isArray(options.palette) ? options.palette.filter((c) => HEX.test(c)) : []).map((hex) => new THREE.Color(hex));
    const colors = palette.length ? palette : DEFAULT_DUST.map((hex) => new THREE.Color(hex));
    const rng = mulberry32(options.seed ?? 1543);
    const count = particleCount(5000, stage.tier);
    const positions = new Float32Array(count * 3);
    const dustColors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() * 2 - 1) * 2.4;
      positions[i * 3 + 1] = (rng() * 2 - 1) * 1.6;
      positions[i * 3 + 2] = (rng() * 2 - 1) * 1.4;
      const c = colors[i % colors.length];
      dustColors.set([c.r, c.g, c.b], i * 3);
      seeds[i] = rng();
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeometry.setAttribute('aColor', new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const dustUniforms = { uTime: { value: 0 }, uScale: { value: 1 } };
    const dustMaterial = new THREE.ShaderMaterial({ vertexShader: dustVertex, fragmentShader: dustFragment, uniforms: dustUniforms, transparent: true, depthWrite: false });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.frustumCulled = false;
    dust.renderOrder = parts.length * 2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(HEX.test(options.background || '') ? options.background : '#161616');
    scene.add(stack, dust);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.6);
    const stackHalfWidth = (manifest.width / 2) * k;

    return {
      scene,
      camera,
      update({ time, progress, pointer }) {
        const a = Math.min(1, progress / 0.7); // apart at 0, flat and face-on by 0.7
        const e = a * a * (3 - 2 * a);
        parts.forEach((part, i) => { part.group.position.z = (i - mid) * SPREAD * (1 - e); });
        edgeMaterial.opacity = 0.35 * (1 - e);
        const targetY = -0.6 * (1 - e) + pointer.x * 0.2;
        const targetX = 0.18 * (1 - e) + pointer.y * 0.1;
        stack.rotation.y += (targetY - stack.rotation.y) * 0.08;
        stack.rotation.x += (targetX - stack.rotation.x) * 0.08;
        dustUniforms.uTime.value = time;
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        dustUniforms.uScale.value = dpr * (height / 900);
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const halfW = halfH * camera.aspect;
        const lift = camera.aspect < 0.8 ? 0.25 : 0; // phones: raise the print clear of the title
        stack.scale.setScalar(Math.min(1, (halfW * 0.9) / (stackHalfWidth + 0.05), (halfH * 0.9 - lift) / (STACK_HEIGHT / 2)));
        stack.position.y = lift;
        stack.position.x = camera.aspect > 1.2 ? halfW * 0.3 : 0; // keep the bottom-left title clear on wide screens
      },
      dispose() {
        parts.forEach((part) => {
          part.geometry.dispose();
          part.material.dispose();
          part.edges.dispose();
          if (part.texture) part.texture.dispose();
        });
        edgeMaterial.dispose();
        dustGeometry.dispose();
        dustMaterial.dispose();
      },
    };
  },
};
```

- [ ] **Step 3: Register the world and switch DEAD TIRED to it**

In `src/worlds/names.js`, add `'layers'` to the end of `WORLD_NAMES`. Add `layers: { manifest: 'one' },` to `WORLD_ASSETS`.

In `src/content/projects.js`, in the `dead-tired` entry, replace the `world` and `worldOptions` lines with:
```js
    world: 'layers',
    worldOptions: { manifest: 'layers/layers.json', palette: ['#bca775', '#8c1f25'] },
```
- Leave every other field as it is.
- The old `cover` entry goes. Its file is deleted in Task 4.
- The old three-colour palette gives way to the spec's two ink-dust colours, bone and red.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all PASS. The registry completeness test finds `src/worlds/layers.js`, and `npm run check` prints `Content OK: 4 projects.`

Run: `npx playwright test tests/e2e/dead-tired-world.spec.js tests/e2e/picture.spec.js tests/e2e/site.spec.js`
Expected: all PASS.

- [ ] **Step 5: Look at it**

Write a throwaway Playwright script in this plan's SDD workspace `scratch/` folder, which is gitignored. Run it against `npx vite preview --port 4175` after `npm run build`, using `chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })`:
- At 1440×900 with `?tier=high`, scroll to the DEAD TIRED chapter at 0.1, 0.4 and 0.8 of its intro track. The scroll offset is `top = section.getBoundingClientRect().top + scrollY + (section.querySelector('.scene__track').offsetHeight - innerHeight) * f`. Wait for `#dead-tired.is-live`, then wait about 3 s.
- Do the same at 375×812 for 0.1 and 0.8.

Stop the server, then view the screenshots with the Read tool. Check that:
- at 0.1 the layers are visibly separate: a turned stack with the bone outlines showing, and the skeleton in front of the titles;
- at 0.8 they read as the finished print, face-on, matching `public/projects/dead-tired/on-black.webp`'s design;
- ink dust drifts around;
- the Big Shoulders title stays readable;
- on the phone the print sits above the title;
- on the phone at 0.1, no layer is cut off at the screen edges. `resize` only sizes for the flat print, and the turned, spread stack is wider.

If something reads badly, tune only these, and say what you changed:
- `SPREAD`;
- the rotation amounts;
- the lift;
- the fit factors in `resize` (for example, a smaller width factor on phones);
- the dust count.

- [ ] **Step 6: Commit**

```bash
git add src/worlds/layers.js src/worlds/names.js src/content/projects.js tests/e2e/dead-tired-world.spec.js
git commit -m "feat: add the exploded-print layers world and use it for DEAD TIRED" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Posters, tidy-up and docs

**Files:**
- Modify: `tools/publish-media.mjs` (drop the DEAD TIRED cover job), `CLAUDE.md`
- Delete: `public/projects/dead-tired/cover.webp`
- Regenerated and committed: `public/posters/*.webp` (at least `dead-tired.webp`; `halcyon-somatics.webp` is re-rendered with its panels now awaited)

**Interfaces:**
- Consumes: `npm run posters` and still mode with `ready` (Task 1); the `layers` world (Task 3).
- Produces: a DEAD TIRED poster of the compressed print, and an accurate CLAUDE.md.

- [ ] **Step 1: Drop the unused DEAD TIRED cover**

Run: `grep -rn "dead-tired/cover" src tools tests`
Expected: the only hit is the cover job in `tools/publish-media.mjs`.

Delete that `JOBS` entry (the line containing `dead-tired/cover.webp`), then run `git rm public/projects/dead-tired/cover.webp`.

- [ ] **Step 2: Regenerate the posters and look**

Run: `npm run posters && npm run check:media`
Expected: six `poster:` lines and no `[page]` errors. The metadata check passes.

Open `public/posters/dead-tired.webp` and `public/posters/halcyon-somatics.webp` with the Read tool, and check that:
- the DEAD TIRED poster shows the finished print (red DEAD TIRED titles, bone skeleton, bottom bar) on `#161616` with ink dust;
- the HALCYON poster still shows its three glass panels.

- [ ] **Step 3: Update CLAUDE.md**

In the commands table, add a row after the `npm run video:halcyon` row:
```
| `npm run layers:dead-tired` | Re-crops the DEAD TIRED layer PNGs from `raw/tee/layers/` into `public/projects/dead-tired/layers/` plus its `layers.json` manifest |
```
Replace the Status section's first two sentences with:
```
Milestones 1 (shell), 2 (HALCYON world) and 3 (DEAD TIRED world) are in place. HALCYON uses its own "halcyon" world; DEAD TIRED uses the reusable "layers" world (a design's layers, from a layers.json manifest, float apart and slide together); Pico Light Show and ASCII Mirror still use the "picture" world; the hero uses "index" and the next slot uses "dormant".
```
In that section, change "Custom worlds come in later milestones: DEAD TIRED (3), Pico Light Show (4) and ASCII Mirror (5)." to "Custom worlds come in later milestones: Pico Light Show (4) and ASCII Mirror (5)."

- [ ] **Step 4: Run everything and review the screenshots**

Run: `npm test && npm run test:e2e`
Expected: everything passes.

Open `screens/desktop-dead-tired.png`, `screens/desktop-dead-tired-panel.png`, `screens/mobile-dead-tired.png` and `screens/mobile-dead-tired-panel.png` with the Read tool, and check that:
- the title is readable over the stack;
- the content panel's three images sit correctly;
- nothing overflows on the phone.

Fix the CSS for anything wrong, then rerun.

- [ ] **Step 5: Commit**

```bash
git add tools/publish-media.mjs CLAUDE.md public/posters
git commit -m "chore: regenerate posters for the DEAD TIRED world, drop its unused cover, update CLAUDE.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The `git rm` from Step 1 is already staged.

---

### Task 5: Milestone review with Oscar

**Files:** none, unless the review asks for fixes.

- [ ] **Step 1:** Run `npm test && npm run test:e2e && npm run check && npm run check:media`. Expected: all green.
- [ ] **Step 2:** Stop any running dev server, then start the preview with `preview_start` (name `portfolio-dev`, from `C:\Users\Oscar\Downloads\.claude\launch.json`). Scroll slowly through the DEAD TIRED chapter, so the layers come apart and back together, then move the mouse. Take screenshots, send the best two to Oscar with `SendUserFile`, and ask him to try it himself in the preview pane.
- [ ] **Step 3:** Ask Oscar whether the exploded print looks right. Make the small fixes he asks for, rerun Step 1, and commit each fix. Milestone 3 is done when Oscar says it looks right.
