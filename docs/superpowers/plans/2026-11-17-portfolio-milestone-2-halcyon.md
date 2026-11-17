# Portfolio Milestone 2 (HALCYON world) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the HALCYON SOMATICS chapter its own "chrome body" world, plus a screen recording of the live page that plays while it's on screen. This replaces the temporary picture-to-particles world from milestone 1.

**Architecture:**
- The new `halcyon` world fetches HALCYON's own `body-wireframe.svg` and turns each stroke into a polyline using the browser's SVG geometry API. It then spreads particles along those lines with a pure, unit-tested sampler.
- The particles are ice white on deep teal. They start scattered and settle into the body by progress 0.6, and a scan line sweeps down the body.
- Three blurred "glass" panels showing real HALCYON screenshots drift past the body as you scroll.
- World asset rules move into one table (`WORLD_ASSETS`). The build check and the HTML renderer both use it, so any world can name the files it needs.
- The screen recording is captured with Playwright, converted to H.264 MP4 with `ffmpeg-static`, and played by a small helper only while the video is on screen.

**Tech Stack:** Milestone 1's stack (Vite 6.4.1, three.js 0.181.0, Lenis 1.3.11, Vitest 3.2.4, Playwright 1.61.1 on Microsoft Edge, sharp 0.32.6), plus `ffmpeg-static` 5.2.0 as a new dev dependency.

**Spec:** `docs/superpowers/specs/2026-11-16-portfolio-design.md` (§4.2 for the HALCYON world; §7 for the screen video; §8 for the quality bars)

**Builds on:** milestone 1, merged to `main` at `af6fe9f`. Its plan is `docs/superpowers/plans/2026-11-16-portfolio-milestone-1-shell.md`, and `CLAUDE.md` explains the current code.

## Global Constraints

- **Node:** must run on Node 18.16.0 (this PC) and Node 20 (CI).
- **Exact versions:** install with `--save-exact`.
  - vite 6.4.1, vitest 3.2.4, @playwright/test 1.61.1, sharp 0.32.6, three 0.181.0, lenis 1.3.11 (all already installed).
  - New: ffmpeg-static 5.2.0, as a devDependency (engines `>=16`). Its install script downloads one ffmpeg binary (about 70 MB) from its GitHub releases.
- **Playwright browser:** Playwright drives the installed Microsoft Edge (`channel: 'msedge'`) with SwiftShader WebGL. Edge can play H.264 MP4 headless.
- **The repo will be public.** No file or commit message may contain Oscar's surname, school, state, assignment name or any email address. The only name shown is "Oscar". `tests/unit/privacy.test.js` must keep passing.
- **Git identity:** commit with the existing global git identity. Never change git config.
- **No pushing:** do not push and do not create a remote. Publishing is milestone 6.
- **No third parties:** the built site makes no requests to third-party hosts.
- **Look:** dark only. The HALCYON world uses ice white `#e6f4f7` on deep teal `#0b1a1f` (spec §4.2), and the chapter title stays in Michroma.
- **Base path:** every URL written into HTML goes through `withBase()` with `BASE` from `site.config.js`, and every attribute value goes through `escapeHtml()`.
- **Never commit:** `raw/`, `sources.local.json`, `privacy.local.json` or `screens/`.
- **Media:** published images are WebP with no EXIF, XMP or IPTC metadata, and `npm test` enforces this. The video is H.264 MP4 with metadata stripped (`-map_metadata -1`), no audio, and a WebP poster.
- **Commit messages:** every one ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pass it as a second `-m`.
- **Working directory and branch:** all commands run from `C:\Users\Oscar\Downloads\portfolio` in Git Bash, on the branch `milestone-2-halcyon` (cut from `main` when execution starts).
- **Dev server and git:** stop any running dev server before switching branches. Windows file locks otherwise block `git checkout`.

## Review Focus

1. **A panel screenshot that fails to load** should only drop that panel: the body still assembles and the chapter stays live, with no poster fallback for missing decoration. Task 3's browser test covers this.
2. **The body wireframe failing to load** should make the HALCYON chapter fall back to its poster, while the other chapters keep working. Task 3's browser test covers this.
3. **A visitor who pauses the screen recording,** scrolls away and comes back should find it still paused. Autoplay must not fight them. Task 4's browser test covers this.
4. **A reduced-motion visitor** should never see the recording start by itself, but its controls should still play it. Task 4's browser test covers this.
5. **A project that names the `halcyon` world but leaves out `svg` or `panels`** should fail the build check with the missing option named, instead of shipping a blank chapter. Task 2's unit test covers this.

---

## File Structure

```
src/lib/polyline.js              NEW  pure: polylineLength(), samplePolylines()
src/worlds/lib/svg-lines.js      NEW  browser: svgToPolylines(svgText) via getPointAtLength
src/worlds/halcyon.js            NEW  the "chrome body" world
src/worlds/names.js              MOD  + 'halcyon' in WORLD_NAMES; + WORLD_ASSETS table
src/content/validate.js          MOD  world asset checks driven by WORLD_ASSETS
src/content/render.js            MOD  worldOptions URL resolution driven by WORLD_ASSETS; video loop + data-autoplay
src/ui/media.js                  NEW  autoplayVideos(): play on screen, pause off screen, respect the visitor
src/app.js                       MOD  call autoplayVideos()
src/content/projects.js          MOD  HALCYON uses world 'halcyon'; screen recording added to its media
tools/publish-media.mjs          MOD  copy body-wireframe.svg into the project folder; drop the unused HALCYON cover
tools/capture-halcyon-video.mjs  NEW  record → H.264 MP4 + WebP poster
public/projects/halcyon-somatics/{body-wireframe.svg, screen.mp4, screen-poster.webp}  NEW (generated, committed)
public/projects/halcyon-somatics/cover.webp   DELETE (no longer used)
public/posters/halcyon-somatics.webp          REGENERATED
tests/unit/polyline.test.js      NEW
tests/unit/validate.test.js, render.test.js   MOD
tests/e2e/halcyon-world.spec.js, video.spec.js  NEW
CLAUDE.md                        MOD  status + commands
```

---

### Task 1: Polyline sampler

**Files:**
- Create: `src/lib/polyline.js`
- Test: `tests/unit/polyline.test.js`

**Interfaces:**
- Produces:
  - `polylineLength(points: ArrayLike<number>): number`, where `points` are flat `[x0, y0, x1, y1, ...]`.
  - `samplePolylines(polylines: { points, weight?: number = 1, color?: [r, g, b] }[], count: number, rng: () => number)`, returning `{ positions: Float32Array (count×2, x/y in the polylines' units), colors: Float32Array (count×3), lines: Uint32Array (count; the index of the polyline each point came from), count: number }`.
  - Points are spread along the lines in proportion to segment length × weight.
  - Lines with weight ≤ 0 and zero-length segments are skipped. `count` is 0 when nothing is left.
  - `color` defaults to white.

- [ ] **Step 1: Write the failing test**

`tests/unit/polyline.test.js`:
```js
import { it, expect } from 'vitest';
import { polylineLength, samplePolylines } from '../../src/lib/polyline.js';
import { mulberry32 } from '../../src/lib/rng.js';

const line = (points, extra = {}) => ({ points, color: [1, 0.5, 0], ...extra });

it('measures a polyline', () => {
  expect(polylineLength([0, 0, 3, 4, 3, 10])).toBeCloseTo(11);
  expect(polylineLength([5, 5])).toBe(0);
});

it('puts every point on the line and keeps its colour', () => {
  const r = samplePolylines([line([0, 0, 10, 0])], 300, mulberry32(1));
  expect(r.count).toBe(300);
  expect(r.positions.length).toBe(600);
  for (let k = 0; k < 300; k++) {
    expect(r.positions[k * 2 + 1]).toBe(0);
    expect(r.positions[k * 2]).toBeGreaterThanOrEqual(0);
    expect(r.positions[k * 2]).toBeLessThanOrEqual(10);
  }
  expect(Array.from(r.colors.slice(0, 3))).toEqual([1, 0.5, 0]);
});

it('follows bends in a polyline', () => {
  const r = samplePolylines([line([0, 0, 10, 0, 10, 10])], 400, mulberry32(2));
  for (let k = 0; k < 400; k++) {
    const x = r.positions[k * 2];
    const y = r.positions[k * 2 + 1];
    expect(y === 0 || x === 10).toBe(true);
  }
});

it('spreads points by length times weight', () => {
  const r = samplePolylines([line([0, 0, 10, 0]), line([0, 5, 10, 5], { weight: 3 })], 4000, mulberry32(3));
  let onSecond = 0;
  for (let k = 0; k < 4000; k++) if (r.positions[k * 2 + 1] === 5) onSecond++;
  expect(onSecond / 4000).toBeGreaterThan(0.7);
  expect(onSecond / 4000).toBeLessThan(0.8);
});

it('records which polyline each point came from', () => {
  const r = samplePolylines([line([0, 0, 1, 0], { weight: 0 }), line([0, 1, 1, 1])], 20, mulberry32(5));
  expect(Array.from(r.lines).every((i) => i === 1)).toBe(true);
});

it('returns zero points when nothing can be sampled', () => {
  expect(samplePolylines([line([0, 0, 0, 0]), line([0, 0, 5, 0], { weight: 0 })], 50, mulberry32(4)).count).toBe(0);
  expect(samplePolylines([], 50, mulberry32(4)).count).toBe(0);
});

it('defaults the colour to white', () => {
  const r = samplePolylines([{ points: [0, 0, 1, 0] }], 1, mulberry32(6));
  expect(Array.from(r.colors)).toEqual([1, 1, 1]);
});

it('is deterministic for the same seed', () => {
  const a = samplePolylines([line([0, 0, 4, 9, 2, 1])], 64, mulberry32(9));
  const b = samplePolylines([line([0, 0, 4, 9, 2, 1])], 64, mulberry32(9));
  expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/polyline.test.js`
Expected: FAIL, because `src/lib/polyline.js` doesn't exist yet.

- [ ] **Step 3: Implement `src/lib/polyline.js`**

```js
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
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run tests/unit/polyline.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/polyline.js tests/unit/polyline.test.js
git commit -m "feat: add a seeded sampler that spreads points along polylines" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: World asset rules in one table

**Files:**
- Modify: `src/worlds/names.js`, `src/content/validate.js`, `src/content/render.js`
- Test: `tests/unit/validate.test.js`, `tests/unit/render.test.js`

**Interfaces:**
- Produces:
  - `WORLD_ASSETS` from `src/worlds/names.js`: `{ picture: { cover: 'one' }, halcyon: { svg: 'one', panels: 'list' } }`. Each value is the kind of file reference the world needs in `worldOptions`, relative to `public/projects/<id>/`.
  - `validateProjects(projects, { worldNames, fileExists, worldAssets = WORLD_ASSETS })`. The picture-specific check is replaced by a generic loop. The messages keep the existing forms: `the "<world>" world needs "worldOptions.<key>"` (with ` (a list of files)` appended for lists) and `<key> file not found: public/projects/<id>/<file>`.
  - `renderChapter` resolves every `WORLD_ASSETS` key of the project's world to a full URL inside `data-world-options`, so lists become lists of URLs.
- Does not change `WORLD_NAMES`. `'halcyon'` is added in Task 3, together with its world file, because the registry test requires both at once.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/validate.test.js`, add `'projects/demo/body.svg'` and `'projects/demo/a.webp'` to the `files` set, then add this inside `describe('validateProjects', ...)`:
```js
  it('checks the files each world needs, including lists', () => {
    const ctx2 = { ...ctx, worldNames: [...ctx.worldNames, 'halcyon'] };
    const halcyon = (worldOptions) => validateProjects([valid({ world: 'halcyon', worldOptions })], ctx2);
    expect(halcyon({ svg: 'body.svg', panels: ['a.webp'] })).toEqual([]);
    expect(halcyon({ svg: 'body.svg' })[0]).toMatch(/the "halcyon" world needs "worldOptions\.panels" \(a list of files\)/);
    expect(halcyon({ svg: 'body.svg', panels: [] })[0]).toMatch(/needs "worldOptions\.panels"/);
    expect(halcyon({ panels: ['a.webp'] })[0]).toMatch(/the "halcyon" world needs "worldOptions\.svg"/);
    expect(halcyon({ svg: 'body.svg', panels: ['a.webp', 'b.webp'] })[0]).toMatch(/panels file not found: public\/projects\/demo\/b\.webp/);
  });
```

In `tests/unit/render.test.js`, add this inside `describe('renderChapter', ...)`:
```js
  it('resolves every asset a world needs to full URLs, including lists', () => {
    const html = renderChapter(project({ world: 'halcyon', worldOptions: { svg: 'body.svg', panels: ['a.webp', 'b.webp'], palette: ['#ffffff'] } }), 0, '/sub/');
    expect(html).toContain('&quot;svg&quot;:&quot;/sub/projects/demo/body.svg&quot;');
    expect(html).toContain('&quot;panels&quot;:[&quot;/sub/projects/demo/a.webp&quot;,&quot;/sub/projects/demo/b.webp&quot;]');
    expect(html).toContain('&quot;palette&quot;:[&quot;#ffffff&quot;]');
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/unit/validate.test.js tests/unit/render.test.js`
Expected: the two new tests FAIL. There's no halcyon asset rule yet, and `svg`/`panels` aren't resolved. All existing tests still pass.

- [ ] **Step 3: Implement**

Replace `src/worlds/names.js` with:
```js
// Every world a project (or the hero / next slot) may use. Each name has a file in src/worlds/<name>.js.
export const WORLD_NAMES = ['index', 'picture', 'dormant'];

// Files each world needs in worldOptions, relative to public/projects/<id>/.
// 'one' = a single file name, 'list' = a non-empty list of file names.
export const WORLD_ASSETS = {
  picture: { cover: 'one' },
  halcyon: { svg: 'one', panels: 'list' },
};
```

In `src/content/validate.js`, add `import { WORLD_ASSETS } from '../worlds/names.js';` at the top. Change the signature to `export function validateProjects(projects, { worldNames, fileExists, worldAssets = WORLD_ASSETS }) {`. Then replace the whole `if (p.world === 'picture') { ... }` block with:
```js
    const needs = isText(p.world) ? worldAssets[p.world] : undefined;
    if (needs) {
      for (const [key, kind] of Object.entries(needs)) {
        const value = o ? o[key] : undefined;
        const ok = kind === 'list' ? Array.isArray(value) && value.length > 0 && value.every(isText) : isText(value);
        if (!ok) { fail(`the "${p.world}" world needs "worldOptions.${key}"${kind === 'list' ? ' (a list of files)' : ''}`); continue; }
        for (const file of kind === 'list' ? value : [value]) {
          if (!fileExists(`projects/${p.id}/${file}`)) fail(`${key} file not found: public/projects/${p.id}/${file}`);
        }
      }
    }
```

In `src/content/render.js`, add `import { WORLD_ASSETS } from '../worlds/names.js';` at the top. Then replace `worldOptionsFor` with:
```js
function worldOptionsFor(project, base) {
  const options = { ...(project.worldOptions || {}) };
  for (const [key, kind] of Object.entries(WORLD_ASSETS[project.world] || {})) {
    if (kind === 'list' && Array.isArray(options[key])) options[key] = options[key].map((file) => assetUrl(base, project.id, file));
    else if (typeof options[key] === 'string') options[key] = assetUrl(base, project.id, options[key]);
  }
  return options;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run tests/unit/validate.test.js tests/unit/render.test.js && npm test`
Expected: all PASS. The existing picture-cover tests keep their messages, and `npm run check` still prints `Content OK: 4 projects.`

- [ ] **Step 5: Commit**

```bash
git add src/worlds/names.js src/content/validate.js src/content/render.js tests/unit/validate.test.js tests/unit/render.test.js
git commit -m "feat: let each world declare the files it needs in one table" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The HALCYON "chrome body" world

**Files:**
- Create: `src/worlds/lib/svg-lines.js`, `src/worlds/halcyon.js`, `tests/e2e/halcyon-world.spec.js`
- Modify: `src/worlds/names.js` (add `'halcyon'`), `tools/publish-media.mjs` (copy the SVG), `src/content/projects.js` (HALCYON's `world` and `worldOptions`)
- Generated and committed: `public/projects/halcyon-somatics/body-wireframe.svg`

**Interfaces:**
- Consumes:
  - `samplePolylines` (Task 1), `WORLD_ASSETS.halcyon` (Task 2), `mulberry32` and `particleCount`.
  - The stage contract: `create(ctx = { renderer, tier }, options)` → `{ scene, camera, update({ time, delta, progress, pointer, tier }), resize(width, height, dpr), dispose() }`. A throw from `create` falls back to the poster.
- Produces:
  - `svgToPolylines(svgText, { step = 1.5 }?)`, returning `{ width, height, polylines: { stroke: string, points: Float32Array }[] }`. The polylines are in the SVG's own units, `stroke` is lowercased, and elements without a stroke are skipped. It throws if the text isn't an SVG document.
  - The default export `{ name: 'halcyon', create }`, which reads `options.svg` (URL, required) and `options.panels` (URLs).
  - The world throws if the SVG fails to load or yields no lines. A panel that fails is skipped with a `console.warn`.

- [ ] **Step 1: Copy the wireframe into the project folder**

In `tools/publish-media.mjs`, add a second entry to `COPIES`:
```js
const COPIES = [
  { from: 'raw/pico/boot.py', to: `${P}/pico-light-show/boot.py` },
  { from: 'public/halcyon/assets/body-wireframe.svg', to: `${P}/halcyon-somatics/body-wireframe.svg` },
];
```
Then run: `mkdir -p public/projects/halcyon-somatics && cp public/halcyon/assets/body-wireframe.svg public/projects/halcyon-somatics/body-wireframe.svg`
Expected: the file exists. `npm run media` will reproduce it from now on.

- [ ] **Step 2: Write the failing browser test**

`tests/e2e/halcyon-world.spec.js`:
```js
import { test, expect } from '@playwright/test';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('the HALCYON chapter runs its own chrome-body world', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./');
  await expect(page.locator('#halcyon-somatics')).toHaveAttribute('data-world', 'halcyon');
  await scrollToId(page, 'halcyon-somatics');
  await expect(page.locator('#halcyon-somatics')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('a missing panel screenshot only drops that panel', async ({ page }) => {
  await page.route('**/projects/halcyon-somatics/shot-terms-900.webp', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'halcyon-somatics');
  await expect(page.locator('#halcyon-somatics')).toHaveClass(/is-live/, { timeout: 30_000 });
  await expect(page.locator('#halcyon-somatics')).not.toHaveClass(/is-failed/);
});

test('if the body wireframe fails to load, the chapter falls back to its poster', async ({ page }) => {
  await page.route('**/projects/halcyon-somatics/body-wireframe.svg', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'halcyon-somatics');
  await expect(page.locator('#halcyon-somatics')).toHaveClass(/is-failed/, { timeout: 30_000 });
  await expect.poll(() => page.locator('#halcyon-somatics .scene__poster').evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
});

test('still mode renders the HALCYON world for its poster', async ({ page }) => {
  await page.goto('./?still=halcyon-somatics&p=0.85&tier=high');
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
});
```

Run: `npx playwright test tests/e2e/halcyon-world.spec.js`
Expected: FAIL, because `data-world` is still `picture`.

- [ ] **Step 3: Implement `src/worlds/lib/svg-lines.js`**

```js
// Turns every stroked shape in an SVG into a polyline (points in the SVG's own units),
// using the browser's SVG geometry API. Fill-only shapes and text are skipped.
const SHAPES = 'path, line, polyline, polygon, circle, ellipse, rect';

function strokeOf(el) {
  for (let node = el; node && node.nodeType === 1; node = node.parentNode) {
    const stroke = node.getAttribute('stroke');
    if (stroke && stroke !== 'none') return stroke.toLowerCase();
  }
  return null;
}

export function svgToPolylines(svgText, { step = 1.5 } = {}) {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.nodeName !== 'svg') throw new Error('not an SVG document');

  // Geometry methods need the SVG in a live document; attach it invisibly, then remove it.
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  host.appendChild(document.importNode(root, true));
  document.body.appendChild(host);
  try {
    const svg = host.firstElementChild;
    const box = svg.viewBox && svg.viewBox.baseVal;
    const width = (box && box.width) || Number(svg.getAttribute('width')) || 1;
    const height = (box && box.height) || Number(svg.getAttribute('height')) || 1;
    const polylines = [];
    for (const el of svg.querySelectorAll(SHAPES)) {
      const stroke = strokeOf(el);
      if (!stroke) continue;
      const length = el.getTotalLength();
      if (!(length > 0)) continue;
      const n = Math.max(2, Math.ceil(length / step));
      const points = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const p = el.getPointAtLength((i / (n - 1)) * length);
        points[i * 2] = p.x;
        points[i * 2 + 1] = p.y;
      }
      polylines.push({ stroke, points });
    }
    return { width, height, polylines };
  } finally {
    host.remove();
  }
}
```

- [ ] **Step 4: Implement `src/worlds/halcyon.js`**

```js
import * as THREE from 'three';
import { samplePolylines } from '../lib/polyline.js';
import { mulberry32 } from '../lib/rng.js';
import { particleCount } from '../lib/tier.js';
import { svgToPolylines } from './lib/svg-lines.js';

// How each stroke colour in HALCYON's body-wireframe.svg is drawn: [particle colour, density weight, depth offset].
const STROKES = {
  '#7fe9ff': ['#7fe9ff', 1.6, 0.06], // installed hardware: bright cyan, slightly in front
  '#4d7480': ['#e6f4f7', 1.0, 0.0], // chassis outline: ice white
  '#1f3a42': ['#7fb8c4', 0.45, -0.03], // cross-section contours
  '#2c4a53': ['#3d6670', 0.2, -0.06], // calibration frame and height ruler
};
const OTHER_STROKE = ['#e6f4f7', 0.6, 0.0];
const BODY_HEIGHT = 2.1; // world units
const PANEL_WIDTH = 1.15;
// Where the glass panels hang relative to the body, and how fast each drifts with scroll.
const PANEL_LAYOUT = [
  { x: -1.75, y: 0.55, z: -0.9, ry: 0.32, speed: 0.9 },
  { x: 1.7, y: -0.15, z: -1.3, ry: -0.36, speed: 0.6 },
  { x: -1.3, y: -0.95, z: -0.4, ry: 0.22, speed: 1.2 },
];

const vertexShader = /* glsl */ `
attribute vec3 aScatter;
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uAssemble;
uniform float uScale;
uniform float uScanY;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float e = uAssemble * uAssemble * (3.0 - 2.0 * uAssemble);
  vec3 p = mix(aScatter, position, e);
  float t = uTime * 0.3 + aSeed * 6.2831;
  p += vec3(sin(t + p.y * 2.3), cos(t * 0.9 + p.x * 1.9), sin(t * 0.7 + p.y)) * (0.004 + 0.05 * (1.0 - e));
  float scan = smoothstep(0.09, 0.0, abs(position.y - uScanY)) * e;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(20.0, (5.0 + 3.0 * scan) * uScale * (0.7 + aSeed * 0.6) / -mv.z);
  vColor = aColor * (0.75 + 0.25 * e) + vec3(0.5, 0.9, 1.0) * scan * 0.8;
  vAlpha = 0.45 + 0.55 * e;
}`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  gl_FragColor = vec4(vColor * vAlpha * smoothstep(0.25, 0.0, r), 1.0);
}`;

async function loadSvgText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not load ${url} (${response.status})`);
  return response.text();
}

// A screenshot drawn onto a small canvas with a soft blur, so it reads as frosted glass.
async function loadPanelTexture(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const width = 512;
  const height = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * width));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  if ('filter' in g) g.filter = 'blur(2px) saturate(1.15)'; // browsers without canvas filters get a sharp panel
  g.drawImage(img, 0, 0, width, height);
  return { texture: new THREE.CanvasTexture(canvas), aspect: height / width };
}

function makePanel({ texture, aspect }) {
  const geometry = new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_WIDTH * aspect);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const edges = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#7fe9ff', transparent: true, opacity: 0.55 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material), new THREE.LineSegments(edges, edgeMaterial));
  return {
    group,
    dispose() { geometry.dispose(); material.dispose(); texture.dispose(); edges.dispose(); edgeMaterial.dispose(); },
  };
}

export default {
  name: 'halcyon',
  async create(stage, options = {}) {
    if (!options.svg) throw new Error('the halcyon world needs options.svg');
    const shape = svgToPolylines(await loadSvgText(options.svg));
    const rng = mulberry32(options.seed ?? 11);
    const lines = shape.polylines.map(({ stroke, points }) => {
      const [hex, weight, z] = STROKES[stroke] || OTHER_STROKE;
      const c = new THREE.Color(hex);
      return { points, weight, z, color: [c.r, c.g, c.b] };
    });
    const count = particleCount(36000, stage.tier);
    const sampled = samplePolylines(lines, count, rng);
    if (!sampled.count) throw new Error(`${options.svg} has no stroked lines to turn into particles`);

    const k = BODY_HEIGHT / shape.height;
    const positions = new Float32Array(count * 3);
    const scatter = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (sampled.positions[i * 2] - shape.width / 2) * k;
      positions[i * 3 + 1] = -(sampled.positions[i * 2 + 1] - shape.height / 2) * k;
      positions[i * 3 + 2] = lines[sampled.lines[i]].z + (rng() - 0.5) * 0.05;
      scatter[i * 3] = (rng() * 2 - 1) * 3;
      scatter[i * 3 + 1] = (rng() * 2 - 1) * 2;
      scatter[i * 3 + 2] = (rng() * 2 - 1) * 2.5;
      seeds[i] = rng();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(sampled.colors, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const uniforms = { uTime: { value: 0 }, uAssemble: { value: 0 }, uScale: { value: 1 }, uScanY: { value: 0 } };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    const body = new THREE.Group();
    body.add(points);

    // Panels are decoration: one that fails to load is skipped, not fatal.
    const results = await Promise.allSettled((options.panels || []).slice(0, PANEL_LAYOUT.length).map(loadPanelTexture));
    const panels = [];
    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') { console.warn(`[halcyon] panel ${options.panels[i]} failed to load; skipping it.`); return; }
      const panel = makePanel(result.value);
      const at = PANEL_LAYOUT[i];
      panel.group.position.set(at.x, at.y, at.z);
      panel.group.rotation.y = at.ry;
      panel.layout = at;
      panels.push(panel);
    });
    const panelGroup = new THREE.Group();
    panels.forEach((panel) => panelGroup.add(panel.group));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1a1f');
    scene.add(panelGroup, body);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.4);
    const bodyHalfWidth = (shape.width / 2) * k;

    return {
      scene,
      camera,
      update({ time, progress, pointer }) {
        uniforms.uTime.value = time;
        uniforms.uAssemble.value = Math.min(1, progress / 0.6); // scattered at 0, settled by 0.6
        uniforms.uScanY.value = BODY_HEIGHT / 2 - ((time * 0.12) % 1) * BODY_HEIGHT;
        body.rotation.y += (pointer.x * 0.3 - body.rotation.y) * 0.05;
        body.rotation.x += (pointer.y * 0.1 - body.rotation.x) * 0.05;
        panels.forEach((panel, i) => {
          panel.group.position.y = panel.layout.y + (progress - 0.5) * 1.8 * panel.layout.speed + Math.sin(time * 0.4 + i * 2) * 0.04;
        });
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = dpr * (height / 900);
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const halfW = halfH * camera.aspect;
        body.scale.setScalar(Math.min(1, (halfW * 0.9) / (bodyHalfWidth + 0.05), (halfH * 0.92) / (BODY_HEIGHT / 2)));
        body.position.x = camera.aspect > 1.2 ? halfW * 0.3 : 0; // keep the bottom-left title clear on wide screens
        panelGroup.visible = camera.aspect > 0.8; // phones: just the body
        panelGroup.scale.setScalar(Math.min(1, camera.aspect / 1.6));
      },
      dispose() {
        geometry.dispose();
        material.dispose();
        panels.forEach((panel) => panel.dispose());
      },
    };
  },
};
```

- [ ] **Step 5: Register the world and switch HALCYON to it**

In `src/worlds/names.js`, change the first line of the list to `export const WORLD_NAMES = ['index', 'picture', 'dormant', 'halcyon'];`.

In `src/content/projects.js`, in the `halcyon-somatics` entry, replace the `world` and `worldOptions` lines with:
```js
    world: 'halcyon',
    worldOptions: { svg: 'body-wireframe.svg', panels: ['shot-hero-900.webp', 'shot-seraph-900.webp', 'shot-terms-900.webp'] },
```
Leave every other field as it is.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: all PASS. The registry completeness test now finds `src/worlds/halcyon.js` for `'halcyon'`, and `npm run check` prints `Content OK: 4 projects.`

Run: `npx playwright test tests/e2e/halcyon-world.spec.js tests/e2e/picture.spec.js tests/e2e/site.spec.js`
Expected: all PASS.

- [ ] **Step 7: Look at it**

Write a throwaway Playwright script in this plan's SDD workspace `scratch/` folder, which is gitignored. Run it against `npx vite preview --port 4175` after `npm run build`, using `chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })`:
- At 1440×900 with `?tier=high`, scroll to the HALCYON chapter at 0.1 and 0.7 of its intro track and wait about 3 s each time.
- Do the same at 375×812.

Save the screenshots, stop the server, and view them with the Read tool. Check that:
- at 0.1 the particles are a scattered cloud;
- at 0.7 a clear ice-white body wireframe with cyan hardware stands right of centre on desktop, with three frosted screenshot panels around it and a scan band partway down;
- on the phone there is only the body, centred;
- the title stays readable.

Tune only the numbers in `STROKES`, `PANEL_LAYOUT` or the panel opacity if something reads badly, and say what you changed.

- [ ] **Step 8: Commit**

```bash
git add src/worlds/lib/svg-lines.js src/worlds/halcyon.js src/worlds/names.js src/content/projects.js tools/publish-media.mjs public/projects/halcyon-somatics/body-wireframe.svg tests/e2e/halcyon-world.spec.js
git commit -m "feat: add the HALCYON chrome-body world with drifting glass panels" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: HALCYON screen recording that plays while on screen

**Files:**
- Create: `tools/capture-halcyon-video.mjs`, `src/ui/media.js`, `tests/e2e/video.spec.js`
- Modify: `package.json` (+ ffmpeg-static, + script, + `media` chain), `src/content/render.js` (video attributes), `src/app.js` (wire `autoplayVideos`), `src/content/projects.js` (HALCYON media), `tests/unit/render.test.js`
- Generated and committed: `public/projects/halcyon-somatics/screen.mp4`, `public/projects/halcyon-somatics/screen-poster.webp`

**Interfaces:**
- Consumes: `launch()` (tools/lib/browser.mjs) and `serveDir()` (tools/lib/static-server.mjs); the `video` media type, which needs `src`, `poster` and `alt` (Task 4 of milestone 1).
- Produces:
  - `autoplayVideos(doc, { reduced?: boolean, threshold?: number = 0.35 })`, returning an `IntersectionObserver` or `null`.
  - `video[data-autoplay]` plays while at least 35 % visible and pauses when it leaves.
  - A video the visitor paused stays paused until they press play.
  - Nothing autoplays under reduced motion.
  - Rendered videos carry `controls muted loop playsinline preload="none" data-autoplay`.

- [ ] **Step 1: Install ffmpeg-static**

Run: `npm install --save-dev --save-exact ffmpeg-static@5.2.0`
Expected: it installs without `EBADENGINE`, and `node -e "console.log(require('ffmpeg-static'))"` prints a path to an existing `ffmpeg.exe`. If the binary download is blocked, stop and report BLOCKED.

- [ ] **Step 2: Write `tools/capture-halcyon-video.mjs` and record**

```js
// Records the live HALCYON copy (boot sequence, decrypting headline, a glide down to SERAPH-9),
// then writes an H.264 MP4 without metadata or audio, plus a WebP poster frame.
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { launch } from './lib/browser.mjs';
import { serveDir } from './lib/static-server.mjs';

const run = promisify(execFile);
const OUT = 'public/projects/halcyon-somatics';

await fs.mkdir('raw/video', { recursive: true });
const server = await serveDir('public');
const browser = await launch();
let recording;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: 'raw/video', size: { width: 1280, height: 800 } } });
  const page = await context.newPage();
  await page.goto(`${server.url}/halcyon/`, { waitUntil: 'domcontentloaded' }); // fresh session, so the boot sequence plays
  await page.waitForTimeout(7000);
  for (let i = 0; i < 24; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(120); }
  await page.waitForTimeout(2500);
  recording = await page.video().path();
  await context.close(); // finishes writing the recording
} finally {
  await browser.close();
  await server.close();
}

await run(ffmpegPath, ['-y', '-ss', '0.6', '-i', recording, '-an', '-map_metadata', '-1', '-vf', 'scale=1280:-2,fps=30',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${OUT}/screen.mp4`]);
await run(ffmpegPath, ['-y', '-ss', '6', '-i', `${OUT}/screen.mp4`, '-frames:v', '1', 'raw/video/poster.png']);
await sharp('raw/video/poster.png').resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(`${OUT}/screen-poster.webp`);
const { size } = await fs.stat(`${OUT}/screen.mp4`);
console.log(`wrote ${OUT}/screen.mp4 (${(size / 1024 / 1024).toFixed(2)} MB) and ${OUT}/screen-poster.webp`);
```

In `package.json` `"scripts"`:
- add `"video:halcyon": "node tools/capture-halcyon-video.mjs"`;
- append ` && node tools/capture-halcyon-video.mjs` to the end of the `"media"` script.

Run: `npm run video:halcyon`
Expected: it prints the MP4 size, which should be under 4 MB. Open `public/projects/halcyon-somatics/screen-poster.webp` with the Read tool and check that it shows the HALCYON page mid-boot or with its headline, not a blank frame. If it's blank, change `-ss 6` to `-ss 8` and rerun.

- [ ] **Step 3: Write the failing tests**

In `tests/unit/render.test.js`, replace the existing video assertion inside `renderMedia`'s "renders video and model with their posters" test with:
```js
    const video = renderMedia({ type: 'video', src: 'c.mp4', poster: 'c.webp', alt: 'A' }, p, '/');
    expect(video).toContain('poster="/projects/demo/c.webp"');
    expect(video).toContain(' controls muted loop playsinline preload="none" data-autoplay');
```
Keep the model assertion that follows it.

`tests/e2e/video.spec.js`:
```js
import { test, expect } from '@playwright/test';

const VIDEO = '#halcyon-somatics video';

test('the HALCYON recording plays muted on a loop while on screen, and pauses when scrolled away', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await expect(video).toHaveAttribute('loop', '');
  expect(await video.evaluate((v) => v.muted)).toBe(true);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0), { timeout: 20_000 }).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => video.evaluate((v) => v.paused), { timeout: 10_000 }).toBe(true);
});

test('a video the visitor paused stays paused when they scroll back', async ({ page }) => {
  await page.goto('./');
  const video = page.locator(VIDEO);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v) => !v.paused), { timeout: 20_000 }).toBe(true);
  await video.evaluate((v) => v.pause()); // the visitor presses pause
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(await video.evaluate((v) => v.paused)).toBe(true);
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the recording never starts by itself, but its controls are there', async ({ page }) => {
    await page.goto('./');
    const video = page.locator(VIDEO);
    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    expect(await video.evaluate((v) => v.paused)).toBe(true);
    await expect(video).toHaveAttribute('controls', '');
  });
});
```

Run: `npx vitest run tests/unit/render.test.js`
Expected: the video test FAILS, because the `loop` and `data-autoplay` attributes are missing. (The e2e tests fail until Step 5.)

- [ ] **Step 4: Implement the video rendering and autoplay**

In `src/content/render.js`, replace the `case 'video':` return line with:
```js
      return `<figure class="media media--video"><video src="${url(m.src)}" poster="${url(m.poster)}" controls muted loop playsinline preload="none" data-autoplay aria-label="${escapeHtml(m.alt)}"></video>${figcaption(m)}</figure>`;
```

`src/ui/media.js`:
```js
// Muted, looping videos marked data-autoplay play only while they're on screen.
// With reduced motion nothing autoplays (the controls still work), and a video
// the visitor paused stays paused until they press play again.
export function autoplayVideos(doc, { reduced = false, threshold = 0.35 } = {}) {
  const win = doc.defaultView;
  const videos = Array.from(doc.querySelectorAll('video[data-autoplay]'));
  if (!videos.length || reduced || !win || !('IntersectionObserver' in win)) return null;

  const pausedByUs = new WeakSet();
  const pausedByVisitor = new WeakSet();
  for (const video of videos) {
    video.addEventListener('pause', () => {
      if (pausedByUs.has(video)) pausedByUs.delete(video);
      else pausedByVisitor.add(video);
    });
    video.addEventListener('play', () => pausedByVisitor.delete(video));
  }

  const observer = new win.IntersectionObserver((entries) => {
    for (const { target: video, isIntersecting } of entries) {
      if (isIntersecting) {
        if (!pausedByVisitor.has(video)) {
          // play() rejects when the browser blocks autoplay; the video then waits for its controls.
          video.play().catch(() => {});
        }
      } else if (!video.paused) {
        pausedByUs.add(video);
        video.pause();
      }
    }
  }, { threshold });
  videos.forEach((video) => observer.observe(video));
  return observer;
}
```

In `src/app.js`:
- add `import { autoplayVideos } from './ui/media.js';` with the other imports;
- immediately after the `const menu = createMenu({ ... });` statement, add the line `autoplayVideos(doc, { reduced });`.

- [ ] **Step 5: Add the recording to HALCYON's media**

In `src/content/projects.js`, in the `halcyon-somatics` entry, make this the first item of `media`, before `shot-hero.webp`:
```js
      { type: 'video', src: 'screen.mp4', poster: 'screen-poster.webp', alt: 'A screen recording of the HALCYON SOMATICS page: the boot sequence, the decrypting headline, then a scroll down to SERAPH-9', caption: 'The boot sequence and decrypting headline, recorded live.' },
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: all PASS. This includes the media-metadata test, which also scans the new WebP poster.

Run: `npx playwright test tests/e2e/video.spec.js tests/e2e/content.spec.js tests/e2e/site.spec.js`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tools/capture-halcyon-video.mjs src/ui/media.js src/app.js src/content/render.js src/content/projects.js public/projects/halcyon-somatics/screen.mp4 public/projects/halcyon-somatics/screen-poster.webp tests/unit/render.test.js tests/e2e/video.spec.js
git commit -m "feat: add a HALCYON screen recording that plays only while on screen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Posters, tidy-up and docs

**Files:**
- Modify: `tools/publish-media.mjs` (drop the HALCYON cover job), `CLAUDE.md`
- Delete: `public/projects/halcyon-somatics/cover.webp`
- Regenerated and committed: `public/posters/*.webp` (at least `halcyon-somatics.webp` changes)

**Interfaces:**
- Consumes: `npm run posters` (milestone 1, Task 13) and still mode for the `halcyon` world (Task 3).
- Produces: a HALCYON poster of the chrome-body world, and CLAUDE.md describing the new world and commands.

- [ ] **Step 1: Drop the unused HALCYON cover**

Run: `grep -rn "halcyon-somatics/cover" src tools tests`
Expected: the only hit is the cover job in `tools/publish-media.mjs`.

Delete that `JOBS` entry, the line containing `halcyon-somatics/cover.webp`. Then run `git rm public/projects/halcyon-somatics/cover.webp`.

- [ ] **Step 2: Regenerate the posters and look**

Run: `npm run posters && npm run check:media`
Expected: six `poster:` lines and no `[page]` errors. The metadata check passes.

Open `public/posters/halcyon-somatics.webp` with the Read tool. It must show the assembled ice-white body with cyan hardware on deep teal, with glass panels around it, and not a blank frame.

- [ ] **Step 3: Update CLAUDE.md**

In the commands table, add a row after the `npm run media` row:
```
| `npm run video:halcyon` | Re-records the HALCYON screen video (H.264 MP4 + WebP poster) from the live copy in `public/halcyon/` |
```
Replace the Status section's first two sentences with:
```
Milestones 1 (shell) and 2 (HALCYON world) are in place. HALCYON uses its own "halcyon" world (particles traced from its body-wireframe.svg, with drifting glass panels); the other project chapters still use the "picture" world; the hero uses "index" and the next slot uses "dormant".
```
Keep the sentences about later milestones as they are, but change "HALCYON (2), DEAD TIRED (3)" to "DEAD TIRED (3)".

- [ ] **Step 4: Run everything and review the screenshots**

Run: `npm test && npm run test:e2e`
Expected: everything passes.

Open `screens/desktop-halcyon-somatics.png`, `screens/desktop-halcyon-somatics-panel.png`, `screens/mobile-halcyon-somatics.png` and `screens/mobile-halcyon-somatics-panel.png` with the Read tool. `npm run test:e2e` regenerates them. Check that:
- the title is readable over the body;
- the video block sits full width at the top of the media grid with its poster;
- nothing overflows on the phone.

Fix the CSS for anything wrong, then rerun.

- [ ] **Step 5: Commit**

```bash
git add tools/publish-media.mjs CLAUDE.md public/posters
git commit -m "chore: regenerate posters for the HALCYON world, drop its unused cover, update CLAUDE.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The `git rm` from Step 1 is already staged.

---

### Task 6: Milestone review with Oscar

**Files:** none, unless the review asks for fixes.

- [ ] **Step 1:** Run `npm test && npm run test:e2e && npm run check && npm run check:media`. Expected: all green.
- [ ] **Step 2:** Stop any running dev server. Start the preview with `preview_start` (name `portfolio-dev`, defined in `C:\Users\Oscar\Downloads\.claude\launch.json`). Scroll into the HALCYON chapter, then scroll down to its panel so the recording plays. Take screenshots, send the best two to Oscar with `SendUserFile`, and ask him to try it himself in the preview pane.
- [ ] **Step 3:** Ask Oscar whether the HALCYON world and the recording look right, and whether the SERAPH-9 screenshot should be recaptured. Make the small fixes he asks for, rerun Step 1, and commit each fix. Milestone 2 is done when Oscar says it looks right.
