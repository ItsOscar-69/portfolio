# Portfolio Milestone 6: Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site ready for phones and for the public, then publish it to https://itsoscar-69.github.io/ once Oscar approves.

**Architecture:** The plan has two parts.
- **Part A (Tasks 1–8)** is local work on branch `milestone-6-launch`, and subagents can implement it. It covers:
  - the phone layout;
  - portrait posters;
  - shader and easing safety;
  - the model viewer on touch;
  - skipping hidden frames;
  - accessibility and contrast checks;
  - a privacy check over the whole git history;
  - the deploy workflow.
- **Part B** is Oscar's launch review and the first publish. The controller and Oscar run it together, and it is never dispatched. Every step that leaves this PC waits for Oscar's go-ahead at that moment.

**Tech Stack:** Vite 6.4.1, three.js 0.181.0, Vitest 3.2.4, Playwright 1.61.1 (Edge with SwiftShader), sharp 0.32.6, ffmpeg-static 5.2.0, and one new dev dependency: axe-core 4.14.0. Node 18.16 runs locally and Node 22 in CI.

**Spec:** `docs/superpowers/specs/2026-11-16-portfolio-design.md` (§8 quality bars, §9 testing, §10 hosting, §11 milestone 6)

## Global Constraints

- **Name:** the first name "Oscar" only. No surname, school, state, assignment name or email address in any file or commit message (spec §10). This plan is public too.
- **Git identity:** commit with the existing global git identity and never change git config. Test fixtures that need a temporary repo set the identity with `GIT_AUTHOR_*` and `GIT_COMMITTER_*` environment variables.
- **Third parties:** the built site makes no requests to third parties (spec §7).
- **Private files:** never open, print, copy or commit `privacy.local.json` or `sources.local.json`. Tools may read them, as `tests/unit/privacy.test.js` does. Never commit `raw/`, `screens/` or `.superpowers/`.
- **Local paths:** never write a local path from outside the repo into any file or commit.
- **Commit trailer:** every commit message ends with a second `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- **Pushing:** no push, remote, repo creation or GitHub setting change in Part A. Part B does these with Oscar, one go-ahead at a time.
- **Dependencies:** the only new one is `axe-core` at exactly `4.14.0`, a devDependency (no dependencies of its own, MPL-2.0). Every other version stays pinned as it is.
- **Node:** local stays on Node 18.16. CI moves to Node 22, because Node 20 reached end of life in April 2026.
- **Camera rules (unchanged):** click-to-start only, video only, frames never leave the browser, and "Camera on" with Stop shows while it runs.
- **Copy:** don't change copy unless Oscar asks for it in Part B.
- **Branch:** `milestone-6-launch`, from `main` at 90681b5.

## Review Focus

1. **Browser toolbars covering the bottom of the screen:** a phone's browser toolbars hide the bottom of a `100vh` frame, which is where every intro's text sits. The frame must use the small viewport height (`100svh`). *Pinned by Task 1, Step 1 (the stylesheet test).*
2. **A phone turned sideways (812×375):** today the Pico and ASCII Mirror meta lines run under the top bar. No intro text may overlap the top bar or the pill at any size. *Pinned by Task 1, Step 1 (the overlap test at five sizes).*
3. **Reversed `smoothstep` edges:** a phone GPU can return anything for `smoothstep(edge0, edge1, x)` when `edge0 >= edge1`, while SwiftShader returns the "expected" value, so no test sees it. *Pinned by Task 3, Step 1.*
4. **Letter case in file paths:** GitHub Pages is case-sensitive and Windows isn't, so a project file named with the wrong case passes `npm run check` here and 404s live. *Pinned by Task 8, Step 1.*
5. **Old commits:** the first push publishes every past commit, not just today's files. A private word or image metadata in an old blob would go public. *Pinned by Task 7, Step 1.*

## Planning evidence (spikes on 20 Nov 2026)

- **Load:**
  - Throttled to slow 4G with a 4× CPU slowdown at 375×812, the first contentful paint is 1.1 s, against the 2 s bar.
  - The hero poster is 295 KB, the largest first-paint file.
- **Live framing (as shown):**
  - 375×812, 768×1024 and 1000×900 look right.
  - At 812×375, the Pico and ASCII Mirror meta lines sit under the top bar.
  - No horizontal overflow at any size.
- **Portrait stills:** all six scenes render well at 900×1600 in still mode.
- **axe-core 4.14.0 found two violations:**
  - `.menu__soon` contrast of 3.1:1 when the menu is open;
  - `.rail__mark` in the HALCYON copy, whose label doesn't contain its visible text.

  axe left 32 text-over-image contrast results "incomplete" because it can't judge them.
- **Contrast measured against what's actually behind the text:** only the hero's count line on a phone fails, at 1.3:1 over the poster and 3.0:1 over the live world.
- **CI rehearsal:** a fresh clone (no `raw/`, no local JSON files) passes `npm ci`, `npm test` (148 passed, the privacy test skipped) and `npm run build` on Node 18.
- **History:**
  - 77 commits, all with noreply identities.
  - All 46 historical image blobs were read in full: none carries EXIF, XMP or IPTC.
  - The current HALCYON `screen.mp4` still carries x264's encoder-settings note (encoder settings only).

---

# Part A: local work (subagent-driven)

### Task 1: Phone layout (small viewport height, phones turned sideways)

**Files:**
- Modify: `src/styles/layout.css:13` (the `.scene__frame` rule), plus a new landscape block at the end of the file
- Modify: `src/styles/chapter.css` (a new landscape block at the end)
- Create: `tests/e2e/layout.spec.js`

**Interfaces:**
- Consumes: the existing markup (`section.scene.chapter`, `.scene__frame`, `.topbar` and `.pill`).
- Produces: nothing later tasks call. Task 2 adds `picture` to the overlap test's skip list, and the skip list already includes it.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/layout.spec.js`:

```js
import { test, expect } from '@playwright/test';

const SIZES = [[375, 812], [812, 375], [768, 1024], [1000, 900], [1440, 900]];
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const [width, height] of SIZES) {
  test(`at ${width}×${height} no intro text runs under the top bar or the pill`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./?posters');
    const ids = await page.locator('section.scene.chapter').evaluateAll((els) => els.map((el) => el.id));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      await page.evaluate((el) => {
        const scene = document.getElementById(el);
        window.scrollTo(0, scene.getBoundingClientRect().top + window.scrollY + 10);
      }, id);
      await page.waitForTimeout(200);
      const { bar, pill, items } = await page.evaluate((el) => {
        const box = (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        const frame = document.querySelector(`#${el} .scene__frame`);
        const items = Array.from(frame.children)
          .filter((n) => !n.matches('.scene__poster, picture, .mirror__ascii') && n.getClientRects().length)
          .map((n) => ({ name: n.className || n.tagName, box: box(n) }));
        const pillEl = document.querySelector('.pill');
        return { bar: box(document.querySelector('.topbar')), pill: pillEl && !pillEl.hidden ? box(pillEl) : null, items };
      }, id);
      for (const it of items) {
        expect(overlaps(it.box, bar), `${id}: ${it.name} runs under the top bar`).toBe(false);
        if (pill) expect(overlaps(it.box, pill), `${id}: ${it.name} runs under the pill`).toBe(false);
      }
    }
  });
}

test('the intro frame uses the small viewport height, so phone toolbars never cover its text', async ({ page }) => {
  await page.goto('./?posters');
  const height = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === '.scene__frame' && rule.style.height) return rule.style.height;
      }
    }
    return null;
  });
  expect(height).toBe('100svh');
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx playwright test tests/e2e/layout.spec.js`

Expected: FAIL in two places:
- the 812×375 case, with a message like "pico-light-show: chapter__meta runs under the top bar";
- the stylesheet test, with Received `"100vh"`.

The other four sizes pass.

- [ ] **Step 3: Implement**

In `src/styles/layout.css:13`, add `height: 100svh;` straight after `height: 100vh;`. The `vh` value stays as the fallback for older browsers. The line becomes:

```css
.scene__frame { position: sticky; top: 0; height: 100vh; height: 100svh; overflow: hidden; isolation: isolate; display: flex; flex-direction: column; justify-content: flex-end; padding: 96px var(--gutter) 88px; }
```

Append to the end of `src/styles/layout.css`:

```css
/* Phones turned sideways: less padding, so the intro fits between the top bar and the pill. */
@media (orientation: landscape) and (max-height: 520px) {
  .scene__frame { padding-top: 60px; padding-bottom: 68px; }
}
```

Append to the end of `src/styles/chapter.css`:

```css
/* Phones turned sideways: titles sized by the screen's height as well as its width. */
@media (orientation: landscape) and (max-height: 520px) {
  .chapter__meta, .badge { margin-bottom: 8px; }
  .chapter__title { font-size: min(clamp(44px, 9vw, 150px), 16vh); }
  .chapter__title.font-michroma { font-size: min(clamp(26px, 6.4vw, 104px), 11vh); }
  .chapter__title.font-big-shoulders { font-size: min(clamp(64px, 13vw, 210px), 21vh); }
  .chapter__hook { margin-top: 8px; font-size: 15px; }
  .lightshow, .mirror { margin-top: 10px; }
}
```

- [ ] **Step 4: Run them and see them pass**

Run: `npx playwright test tests/e2e/layout.spec.js`

Expected: 6 passed. If 812×375 still fails for one chapter, lower that chapter's title cap one step (16vh to 14vh, 11vh to 10vh, or 21vh to 19vh) and say so in the report.

Then take a look: screenshot each chapter at 812×375 with `?tier=high`, under `screens/`, and confirm the text and the world both read well.

- [ ] **Step 5: Run the suites, then commit**

Run: `npm test`, then `npx playwright test tests/e2e/layout.spec.js tests/e2e/site.spec.js tests/e2e/navigation.spec.js`.

```bash
git add src/styles/layout.css src/styles/chapter.css tests/e2e/layout.spec.js
git commit -m "feat: fit the intros on phones turned sideways and under phone browser toolbars" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Portrait posters

**Files:**
- Modify: `tools/posters.mjs` (render a 900×1600 portrait still for each scene as well)
- Modify: `src/content/render.js:22-24` (`posterImg` returns a `<picture>`)
- Modify: `src/styles/layout.css` (`.scene__picture { display: contents; }`)
- Modify: `src/ui/mirror.js` (insert the text mirror after the poster's `<picture>`, not inside it)
- Modify: `tests/unit/posters.test.js`, `tests/unit/render.test.js` (any expectation of the old `posterImg` string)
- Modify: `tests/e2e/posters.spec.js` (new test), `tests/e2e/mirror.spec.js` (one new assertion)
- Create: `public/posters/<id>-portrait.webp` for hero, every project and next

**Interfaces:**
- Consumes: `posterImg(id, base, lazy)` (unchanged signature) and still mode `?still=<id>&p=<progress>&tier=high`.
- Produces:
  - the markup `<picture class="scene__picture"><source media="(max-aspect-ratio: 4/5)" srcset="…/posters/<id>-portrait.webp"><img class="scene__poster" …></picture>`;
  - the files `public/posters/<id>-portrait.webp` at 900×1600.

  Task 6's contrast test runs against these portrait posters.

- [ ] **Step 1: Write the failing tests**

Replace the test in `tests/unit/posters.test.js` with:

```js
import { it, expect } from 'vitest';
import fs from 'node:fs';
import sharp from 'sharp';
import { projects } from '../../src/content/projects.js';

const ids = ['hero', ...projects.map((p) => p.id), 'next'];

it('has a landscape and a portrait poster for every scene (run `npm run posters` after adding a project)', () => {
  const missing = ids.flatMap((id) => [`${id}.webp`, `${id}-portrait.webp`]).filter((f) => !fs.existsSync(`public/posters/${f}`));
  expect(missing, 'run `npm run posters`').toEqual([]);
});

it('portrait posters are 900×1600', async () => {
  for (const id of ids) {
    const { width, height } = await sharp(`public/posters/${id}-portrait.webp`).metadata();
    expect([id, width, height]).toEqual([id, 900, 1600]);
  }
});
```

Add to `tests/unit/render.test.js` (import `posterImg` from `../../src/content/render.js` if the file doesn't already):

```js
it('serves the portrait poster to tall screens and the landscape one elsewhere', () => {
  const html = posterImg('dead-tired', '/', true);
  expect(html).toContain('<picture class="scene__picture">');
  expect(html).toContain('<source media="(max-aspect-ratio: 4/5)" srcset="/posters/dead-tired-portrait.webp">');
  expect(html).toContain('<img class="scene__poster" src="/posters/dead-tired.webp"');
  expect(html).toContain('loading="lazy"');
});
```

Add to `tests/e2e/posters.spec.js`:

```js
test('tall screens get the portrait poster and wide screens the landscape one', async ({ page }) => {
  const src = (id) => page.locator(`#${id} .scene__poster`).evaluate((img) => img.currentSrc);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./?posters');
  await expect.poll(() => src('top')).toMatch(/\/posters\/hero-portrait\.webp$/);
  await page.locator('#dead-tired').scrollIntoViewIfNeeded();
  await expect.poll(() => src('dead-tired')).toMatch(/\/posters\/dead-tired-portrait\.webp$/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => src('dead-tired')).toMatch(/\/posters\/dead-tired\.webp$/);
});
```

In `tests/e2e/mirror.spec.js`, find the reduced-motion text-mirror test that checks the `<pre>`'s opacity and z-index (added in the milestone 5 fixes). Add, while the camera is on:

```js
expect(await page.locator('#ascii-mirror .mirror__ascii').evaluate((el) => el.parentElement.className)).toContain('scene__frame');
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/posters.test.js tests/unit/render.test.js`, then `npx playwright test tests/e2e/posters.spec.js tests/e2e/mirror.spec.js`.

Expected:
- the unit tests FAIL on missing portrait files and the missing `<picture>`;
- the posters e2e test FAILS because `currentSrc` ends in `hero.webp`;
- the mirror assertion passes (the `<pre>` is still a direct child). It guards Step 3.

- [ ] **Step 3: Implement the markup, CSS and mirror change**

In `src/content/render.js`, replace `posterImg` with:

```js
// The poster behind a scene's text: a 9:16 portrait still on tall screens (phones, tablets held upright) and the
// 16:10 still elsewhere. The <img> keeps the scene__poster class, so CSS and scripts find it either way.
export function posterImg(id, base, lazy) {
  const src = (name) => escapeHtml(withBase(base, `/posters/${name}.webp`));
  return `<picture class="scene__picture"><source media="(max-aspect-ratio: 4/5)" srcset="${src(`${id}-portrait`)}"><img class="scene__poster" src="${src(id)}" alt="" aria-hidden="true" decoding="async"${lazy ? ' loading="lazy"' : ''}></picture>`;
}
```

Add to `src/styles/layout.css`, straight after the `.scene__poster` rule. Without `display: contents`, the `<picture>` would become an empty flex item, and the hero's 32 px gap would shift its row:

```css
.scene__picture { display: contents; }
```

In `src/ui/mirror.js`, the milestone 5 fix inserts the `<pre>` with `poster.after(text)`, where `poster` is the frame's `.scene__poster`. That would now put it inside the `<picture>`. Replace that insertion with:

```js
  const poster = frame.querySelector('.scene__poster');
  const anchor = poster ? poster.closest('picture') || poster : null; // after the <picture>, never inside it
  if (anchor) anchor.after(text);
  else frame.prepend(text);
```

- [ ] **Step 4: Render the portrait posters**

In `tools/posters.mjs`, render each scene in two shapes. Replace the single `page` and loop with:

```js
const SHAPES = [['', { width: 1600, height: 1000 }], ['-portrait', { width: 900, height: 1600 }]];
for (const [suffix, viewport] of SHAPES) {
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => { if (m.type() === 'error') console.error(`[page] ${m.text()}`); });
  for (const [id, progress] of scenes) {
    await page.goto(`http://localhost:${PORT}${BASE}?still=${id}&p=${progress}&tier=high`);
    await page.waitForFunction(() => document.documentElement.dataset.stillReady, null, { timeout: 120_000 });
    const state = await page.evaluate(() => document.documentElement.dataset.stillReady);
    if (state !== '1') throw new Error(`poster for "${id}${suffix}" failed to render (${state})`);
    const png = await page.locator('canvas.stage').screenshot();
    await sharp(png).webp({ quality: 80 }).toFile(`public/posters/${id}${suffix}.webp`);
    console.log(`poster: public/posters/${id}${suffix}.webp`);
  }
  await page.close();
}
```

Update the comment on line 1 to say it saves `public/posters/<id>.webp` and `<id>-portrait.webp`.

Run: `npm run posters`. This takes a few minutes.

Then check what changed:
- **Landscape posters:** if any differs from the committed one (`git status public/posters`), look at old and new side by side. Commit a changed landscape poster only if it looks the same; otherwise restore it with `git checkout -- public/posters/<id>.webp` and say so.
- **Portrait posters:** look at every one and list each file's size in the report.

- [ ] **Step 5: Run the tests and see them pass**

Run: `npm test`, then `npx playwright test tests/e2e/posters.spec.js tests/e2e/mirror.spec.js tests/e2e/layout.spec.js tests/e2e/hero.spec.js`.

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add tools/posters.mjs src/content/render.js src/styles/layout.css src/ui/mirror.js tests/unit/posters.test.js tests/unit/render.test.js tests/e2e/posters.spec.js tests/e2e/mirror.spec.js public/posters
git commit -m "feat: give tall screens portrait posters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shaders and easing that behave the same on every GPU and refresh rate

**Files:**
- Create: `tests/unit/shaders.test.js`
- Create: `src/lib/motion.js`
- Create: `tests/unit/motion.test.js`
- Modify, reversed `smoothstep` calls:
  - `src/worlds/dormant.js:12`
  - `src/worlds/halcyon.js:39`
  - `src/worlds/halcyon.js:54`
  - `src/worlds/index.js:36`
  - `src/worlds/picture.js:34`
- Modify, per-frame easing:
  - `src/worlds/ascii.js:139-140`
  - `src/worlds/dormant.js:63`
  - `src/worlds/halcyon.js:169-170`
  - `src/worlds/index.js:94-95`
  - `src/worlds/layers.js:132-133`
  - `src/worlds/pico.js:148-149`
  - `src/worlds/picture.js:103-104`

**Interfaces:**
- Consumes: each world's `update({ time, delta, progress, pointer, tier })`. Some worlds don't destructure `delta` yet; add it.
- Produces: `damp(k, delta) → number` in `src/lib/motion.js`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/shaders.test.js`:

```js
// GLSL leaves smoothstep(edge0, edge1, x) undefined when edge0 >= edge1. SwiftShader returns the "expected" value,
// but a phone GPU may not, so every call keeps its edges in rising order: write 1.0 - smoothstep(lo, hi, x).
import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const files = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : /\.js$/.test(e.name) ? [path.join(dir, e.name)] : []));

it('every literal smoothstep in the shaders has its edges in rising order', () => {
  const bad = [];
  for (const f of files('src')) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/smoothstep\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,/g)) {
      if (parseFloat(m[1]) >= parseFloat(m[2])) bad.push(`${f}: ${m[0]}`);
    }
  }
  expect(bad).toEqual([]);
});
```

Create `tests/unit/motion.test.js`:

```js
import { it, expect } from 'vitest';
import { damp } from '../../src/lib/motion.js';

it('matches the per-frame share at 60 fps', () => {
  expect(damp(0.08, 1 / 60)).toBeCloseTo(0.08, 10);
});

it('two 120 Hz frames move as far as one 60 Hz frame', () => {
  const d = damp(0.08, 1 / 120);
  expect(1 - (1 - d) ** 2).toBeCloseTo(0.08, 10);
});

it('moves nothing in a zero-length frame and never overshoots in a long one', () => {
  expect(damp(0.08, 0)).toBe(0);
  expect(damp(0.08, 0.1)).toBeLessThan(1);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/shaders.test.js tests/unit/motion.test.js`

Expected:
- `shaders.test.js` FAILS, listing the 5 calls;
- `motion.test.js` FAILS on the missing module.

- [ ] **Step 3: Implement**

Create `src/lib/motion.js`:

```js
// Frame-rate-independent easing. `x += (target - x) * k` moves a fixed share every frame, so it runs twice as fast
// on a 120 Hz phone as at 60 Hz, and half as fast at 30 fps. damp(k, delta) is the share for a frame lasting
// `delta` seconds that matches k at 60 fps.
export function damp(k, delta) {
  return 1 - Math.pow(1 - k, delta * 60);
}
```

**Shader edges.** Each rewrite gives the same value for every input:
- `src/worlds/dormant.js:12`: `smoothstep(1.4, 0.0, distance(p.xy, uPointer))` becomes `1.0 - smoothstep(0.0, 1.4, distance(p.xy, uPointer))`.
- `src/worlds/halcyon.js:39`: `smoothstep(0.09, 0.0, abs(position.y - uScanY)) * e` becomes `(1.0 - smoothstep(0.0, 0.09, abs(position.y - uScanY))) * e`.
- `src/worlds/halcyon.js:54` and `src/worlds/index.js:36`: `smoothstep(0.25, 0.0, r)` becomes `(1.0 - smoothstep(0.0, 0.25, r))`.
- `src/worlds/picture.js:34`: `smoothstep(0.25, 0.05, r)` becomes `(1.0 - smoothstep(0.05, 0.25, r))`.

**Easing.** Import `damp` in each world (`import { damp } from '../lib/motion.js';`), make sure `update` destructures `delta`, and replace each per-frame factor:
- `src/worlds/ascii.js:139-140`: `* 0.08` becomes `* damp(0.08, delta)` (both lines).
- `src/worlds/dormant.js:63`: `lerp(target, 0.12)` becomes `lerp(target, damp(0.12, delta))`.
- `src/worlds/halcyon.js:169-170`: `* 0.05` becomes `* damp(0.05, delta)`.
- `src/worlds/index.js:94-95`: `* 0.04` becomes `* damp(0.04, delta)`.
- `src/worlds/layers.js:132-133`: `* 0.08` becomes `* damp(0.08, delta)`.
- `src/worlds/pico.js:148-149`: `* 0.06` becomes `* damp(0.06, delta)`.
- `src/worlds/picture.js:103-104`: `* 0.05` becomes `* damp(0.05, delta)`.

Leave `src/lib/led/effects.js`. Its `*= 0.92` decays belong to the frame-exact boot.py port, which runs on its own fixed 50 fps clock.

Still mode runs 90 frames at `delta = 1/30`, so every eased value still settles before the poster is taken.

- [ ] **Step 4: Run the tests and check that the posters didn't move**

Run: `npm test`, then `npx playwright test tests/e2e/stage.spec.js tests/e2e/hero.spec.js tests/e2e/halcyon-world.spec.js tests/e2e/dead-tired-world.spec.js tests/e2e/pico-world.spec.js tests/e2e/ascii-world.spec.js`.

Expected: all pass.

Then run `npm run posters` and `git status public/posters`. The shader rewrites are exact and the eased values settle, so the posters should look the same. If any poster file changed, compare it by eye with the committed one and restore it if it looks the same (`git checkout -- <file>`). Report what you saw.

- [ ] **Step 5: Commit**

```bash
git add src/lib/motion.js tests/unit/motion.test.js tests/unit/shaders.test.js src/worlds
git commit -m "fix: keep smoothstep edges in rising order and make pointer easing independent of frame rate" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The model viewer on phones (tap to pin a part, context loss)

**Files:**
- Modify: `src/ui/model-viewer.js` (the part buttons and the canvas after it is made)
- Modify: `src/styles/chapter.css` (pressed style for `.model__parts button`)
- Modify: `tests/e2e/model-viewer.spec.js` (two new tests)

**Interfaces:**
- Consumes: `createModelViewers({ doc, reduced })` and its `highlight(id)` (unchanged).
- Produces:
  - each part button carries `aria-pressed="true|false"`;
  - `figure.dataset.highlight` holds the pinned part when nothing is hovered or focused;
  - the console warning `'[model viewer] WebGL context lost; showing the poster.'`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/e2e/model-viewer.spec.js`. It reuses that file's `viewer(page)` and `highlighted(figure)` helpers:

```js
test.describe('on a touch screen', () => {
  test.use({ hasTouch: true });

  test('a tap pins a part, and a second tap unpins it', async ({ page }) => {
    await page.goto('./');
    const figure = await viewer(page);
    const mount = figure.getByRole('button', { name: 'Camera mount (printed)' });
    await expect(mount).toHaveAttribute('aria-pressed', 'false');
    await mount.tap();
    await expect(mount).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => highlighted(figure)).toBe('mount');
    await page.touchscreen.tap(5, 300); // tap somewhere else on the page
    await expect.poll(() => highlighted(figure)).toBe('mount');
    await mount.tap();
    await expect(mount).toHaveAttribute('aria-pressed', 'false');
    await page.touchscreen.tap(5, 300);
    await expect.poll(() => highlighted(figure)).toBeNull();
  });
});

test('if the viewer loses its WebGL context, the poster comes back', async ({ page }) => {
  const warned = page.waitForEvent('console', { predicate: (m) => m.text().includes('[model viewer] WebGL context lost'), timeout: 30_000 });
  await page.goto('./');
  const figure = await viewer(page);
  await expect(figure).toHaveClass(/is-ready/, { timeout: 30_000 });
  await figure.locator('.model__canvas').evaluate((c) => (c.getContext('webgl2') || c.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext());
  await warned;
  await expect(figure).not.toHaveClass(/is-ready/);
  await expect.poll(() => figure.locator('.model__stage img').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx playwright test tests/e2e/model-viewer.spec.js`

Expected:
- the tap test FAILS (`aria-pressed` is missing);
- the context test times out waiting for the warning.

The existing tests pass.

- [ ] **Step 3: Implement**

**Pinning.** In `createModelViewers`, add `let pinned = null;` before the `for (const part of PARTS)` loop. Then replace the button's four listeners with:

```js
      b.setAttribute('aria-pressed', 'false');
      // Hovering or focusing shows a part for a moment. A click or tap pins it until it is pressed again, which is
      // how touch screens use the list: their pointerleave fires as soon as the finger lifts.
      b.addEventListener('pointerenter', () => highlight(part.id));
      b.addEventListener('pointerleave', () => highlight(pinned));
      b.addEventListener('focus', () => highlight(part.id));
      b.addEventListener('blur', () => highlight(pinned));
      b.addEventListener('click', () => {
        pinned = pinned === part.id ? null : part.id;
        buttons.forEach((btn, key) => btn.setAttribute('aria-pressed', String(key === pinned)));
        highlight(pinned || part.id);
      });
```

Update the header comment's "Hovering or focusing a part in the list highlights it." to: "Hovering or focusing a part highlights it; clicking or tapping pins it."

**Context loss.** In `mount()`, add straight after `stage.append(canvas);`:

```js
  let lost = false;
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    pause();
    figure.classList.remove('is-ready');
    console.warn('[model viewer] WebGL context lost; showing the poster.');
  });
```

`pause` is defined further down as a `const`. Move this block below the `pause` definition, so it doesn't run in the temporal dead zone. Then make the draw loop and `run` respect it:
- first line of `loop`: `if (lost) return;`, placed before `raf = …`, so a lost viewer stops scheduling frames;
- `run`: `const run = () => { if (!raf && !lost) raf = win.requestAnimationFrame(loop); };`.

**Pressed style** (not by colour alone: the button fills), added to `src/styles/chapter.css` after the `.model__parts button:hover` rule:

```css
.model__parts button[aria-pressed="true"] { background: #39ff88; border-color: #39ff88; color: #020604; }
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx playwright test tests/e2e/model-viewer.spec.js tests/e2e/ascii-world.spec.js`

Expected: all pass, including the earlier hover, focus, wheel and fallback tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/model-viewer.js src/styles/chapter.css tests/e2e/model-viewer.spec.js
git commit -m "feat: let a tap pin a part in the model viewer, and bring the poster back if its WebGL context is lost" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Rendering cost (skip frames under the panels, `?fps`, the 2-second bar)

**Files:**
- Modify: `src/lib/scroll.js` (add `coveredBy`)
- Modify: `tests/unit/scroll.test.js`
- Modify: `src/app.js` (measure the panels, skip the stage while one covers the screen, wire the meter)
- Create: `src/ui/fps.js`
- Modify: `src/styles/ui.css` (`.fps`)
- Modify: `tests/e2e/stage.spec.js` (the panel test), `tests/e2e/smoke.spec.js` (the `?fps` test and the throttled first-paint test)

**Interfaces:**
- Consumes: the main `tick(now)` loop in `startApp` and `stage.tier` (`'high' | 'mid' | 'low'`).
- Produces:
  - `coveredBy(y, vh, panels: {top, bottom}[]) → boolean`;
  - `createFpsMeter(doc) → { tick(now), setTier(name) }`;
  - the `?fps` URL switch, used in Part B's phone check.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/scroll.test.js`, and add `coveredBy` to its import:

```js
describe('coveredBy', () => {
  const panels = [{ top: 2000, bottom: 5000 }];
  it('is true only while a panel fills the whole viewport', () => {
    expect(coveredBy(2000, 1000, panels)).toBe(true);
    expect(coveredBy(4000, 1000, panels)).toBe(true);
    expect(coveredBy(1999, 1000, panels)).toBe(false); // a pixel of the scene still shows above
    expect(coveredBy(4001, 1000, panels)).toBe(false); // the next scene shows below
    expect(coveredBy(0, 1000, [])).toBe(false);
  });
});
```

Add to `tests/e2e/stage.spec.js`:

```js
test('the stage stops drawing while a chapter panel fills the screen, and starts again after it', async ({ page }) => {
  await page.addInitScript(() => {
    window.__draws = 0;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      for (const name of ['drawArrays', 'drawElements']) {
        const original = proto[name];
        proto[name] = function (...args) { window.__draws++; return original.apply(this, args); };
      }
    }
  });
  await page.goto('./');
  await page.evaluate(() => document.getElementById('dead-tired').scrollIntoView({ block: 'start' }));
  await expect(page.locator('#dead-tired')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(await page.evaluate(() => document.querySelector('#dead-tired .chapter__panel').offsetHeight)).toBeGreaterThan(1400);
  await page.evaluate(() => {
    const panel = document.querySelector('#dead-tired .chapter__panel');
    window.scrollTo(0, panel.getBoundingClientRect().top + window.scrollY + 200);
  });
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.__draws)).toBe(before);
  await page.evaluate(() => document.getElementById('dead-tired').scrollIntoView({ block: 'start' }));
  await expect.poll(() => page.evaluate(() => window.__draws), { timeout: 5_000 }).toBeGreaterThan(before);
});
```

Add to `tests/e2e/smoke.spec.js`:

```js
test('?fps shows a frame-rate readout with the device tier, and is off by default', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(1500);
  await expect(page.locator('.fps')).toHaveCount(0);
  await page.goto('./?fps');
  await expect(page.locator('.fps')).toHaveText(/^\d+ fps · (high|mid|low)$/, { timeout: 15_000 });
});

test('the hero text paints within 2 s on a throttled phone (spec §8.1)', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(baseURL, { waitUntil: 'load', timeout: 60_000 }); // a bare browser context doesn't get baseURL
  const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime);
  expect(fcp).toBeGreaterThan(0);
  expect(fcp).toBeLessThan(2000);
  await context.close();
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/scroll.test.js`, then `npx playwright test tests/e2e/stage.spec.js tests/e2e/smoke.spec.js`.

Expected:
- `coveredBy` FAILS (not exported);
- the draw count keeps rising under the panel, so that test FAILS;
- the `?fps` test FAILS (no `.fps`);
- the throttled first-paint test passes already. It guards the bar from now on; the spike measured 1.1 s.

- [ ] **Step 3: Implement**

Add to `src/lib/scroll.js`:

```js
// panels: [{ top, bottom }] in document px. True while one of them covers the whole viewport, so nothing behind it
// can be seen.
export function coveredBy(y, vh, panels) {
  return panels.some((p) => p.top <= y && p.bottom >= y + vh);
}
```

Create `src/ui/fps.js`:

```js
// ?fps: a small frames-per-second readout with the device tier, for checking real phones against spec §8.1
// (60 fps on a laptop, at least 30 on a mid-range phone). Nothing shows unless the URL asks for it.
export function createFpsMeter(doc) {
  const el = doc.createElement('div');
  el.className = 'fps';
  el.setAttribute('aria-hidden', 'true');
  doc.body.append(el);
  let frames = 0;
  let since = 0;
  let tier = '';
  return {
    setTier(name) { tier = name; },
    tick(now) {
      if (!since) since = now;
      frames++;
      if (now - since >= 1000) {
        el.textContent = `${Math.round((frames * 1000) / (now - since))} fps${tier ? ` · ${tier}` : ''}`;
        frames = 0;
        since = now;
      }
    },
  };
}
```

Add to `src/styles/ui.css`:

```css
.fps { position: fixed; left: 12px; bottom: 12px; z-index: 40; padding: 5px 8px; border-radius: 6px; background: rgba(0, 0, 0, 0.75); color: #39ff88; font: 500 12px/1 var(--font-mono); pointer-events: none; }
```

In `src/app.js`:
1. Imports: change the scroll import to `import { sceneState, coveredBy } from './lib/scroll.js';` and add `import { createFpsMeter } from './ui/fps.js';`.
2. Next to `measure`, add:

   ```js
   function measurePanels(doc, win) {
     const y = win.scrollY;
     return Array.from(doc.querySelectorAll('.chapter__panel')).map((el) => {
       const r = el.getBoundingClientRect();
       return { top: r.top + y, bottom: r.bottom + y };
     });
   }
   ```

3. In `startApp`, right after `const scenes = readScenes(doc);`, add `const fps = params.has('fps') && !still ? createFpsMeter(doc) : null;`.
4. In `loadStage`, after `html.classList.add('webgl');`, add `if (fps) fps.setTier(stage.tier);`.
5. Next to `let layout = measure(scenes, win);`, add `let panels = measurePanels(doc, win);`. Make `remeasure` also run `panels = measurePanels(doc, win);`.
6. In `tick`:
   - after `updateUi();`, add `if (fps) fps.tick(now);`;
   - after the `plan.load.forEach(…)` line and before `stage.frame(…)`, add:

   ```js
       // Nothing behind an opaque panel can be seen, so don't draw while one fills the screen.
       if (coveredBy(win.scrollY, win.innerHeight, panels)) return;
   ```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test`, then `npx playwright test tests/e2e/stage.spec.js tests/e2e/smoke.spec.js tests/e2e/navigation.spec.js tests/e2e/pico-ui.spec.js tests/e2e/mirror.spec.js`.

Expected: all pass. Scroll through the whole page once with `?tier=high` and `?fps`, and confirm every chapter comes back when you scroll out of its panel.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scroll.js tests/unit/scroll.test.js src/app.js src/ui/fps.js src/styles/ui.css tests/e2e/stage.spec.js tests/e2e/smoke.spec.js
git commit -m "perf: skip drawing while a chapter panel covers the screen, and add a ?fps readout for phone checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Accessibility and contrast

**Files:**
- Modify: `package.json`, `package-lock.json` (devDependency `axe-core` `4.14.0`)
- Create: `tests/e2e/a11y.spec.js`
- Create: `tests/e2e/contrast.spec.js`
- Modify: `src/styles/ui.css:12` (`.menu__soon`)
- Modify: `tools/lib/halcyon-transform.mjs` (add `labelRailMark`)
- Modify: `tools/halcyon.mjs:21` (apply `labelRailMark`)
- Modify: `tests/unit/halcyon-transform.test.js`
- Modify: `public/halcyon/index.html` (regenerated)
- Modify: `src/styles/layout.css` (a darker hero scrim on narrow screens)

**Interfaces:**
- Consumes: the portrait posters from Task 2, which are what phones show under reduced motion.
- Produces: `labelRailMark(html) → html`.

- [ ] **Step 1: Install axe-core and write the failing tests**

Run: `npm install --save-dev --save-exact axe-core@4.14.0`, then check that `npm ls axe-core` shows one copy at 4.14.0.

Create `tests/e2e/a11y.spec.js`:

```js
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

// axe-core is injected from node_modules, so no request leaves the machine.
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

async function violations(page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  });
}

const CASES = [
  ['the page', './', {}],
  ['the page with reduced motion', './', { contextOptions: { reducedMotion: 'reduce' } }],
  ['the page on a phone', './', { viewport: { width: 375, height: 812 } }],
  ['the HALCYON copy', './halcyon/', {}],
];
for (const [name, path, options] of CASES) {
  test.describe(name, () => {
    test.use(options);
    test(`axe finds no violations in ${name}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(2000);
      expect(await violations(page)).toEqual([]);
    });
  });
}

test('axe finds no violations with the chapter menu open', async ({ page }) => {
  await page.goto('./');
  await page.locator('.topbar__projects').click();
  await expect(page.locator('#chapter-menu')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
```

Create `tests/e2e/contrast.spec.js`:

```js
import { test, expect } from '@playwright/test';
import sharp from 'sharp';

// Spec §8.3: text over posters and worlds meets WCAG AA. axe can't judge text over images, so this hides each intro
// line, photographs what is behind it, and compares the text colour with the brightest 5% of that background:
// 4.5:1, or 3:1 for large text (24 px, or 18.66 px bold).
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const TEXT = '.chapter__meta, .chapter__title, .chapter__hook, .hero__count, .hero__links a, .badge';

async function lowContrast(page, viewport, live) {
  const failures = [];
  const ids = await page.locator('.scene').evaluateAll((els) => els.map((el) => el.id).filter((id) => id !== 'next'));
  for (const id of ids) {
    await page.evaluate((el) => {
      const scene = document.getElementById(el);
      const track = scene.querySelector('.scene__track');
      window.scrollTo(0, scene.getBoundingClientRect().top + window.scrollY + (track.offsetHeight - innerHeight) * 0.6);
    }, id);
    if (live) await expect(page.locator(`#${id}`)).toHaveClass(/is-live/, { timeout: 60_000 });
    await page.waitForTimeout(live ? 2500 : 800);
    const items = await page.evaluate(({ el, sel }) => Array.from(document.querySelectorAll(`#${el} .scene__frame :is(${sel})`)).map((n, i) => {
      n.dataset.cx = String(i);
      const r = n.getBoundingClientRect();
      const cs = getComputedStyle(n);
      return { name: n.className.split(' ')[0] || n.tagName, color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), box: { x: r.x, y: r.y, width: r.width, height: r.height } };
    }), { el: id, sel: TEXT });
    const hide = await page.addStyleTag({ content: '[data-cx] { color: transparent !important; border-color: transparent !important; text-decoration-color: transparent !important; }' });
    await page.waitForTimeout(300);
    for (const it of items) {
      const x = Math.max(0, it.box.x);
      const y = Math.max(0, it.box.y);
      const clip = { x, y, width: Math.min(viewport.width, it.box.x + it.box.width) - x, height: Math.min(viewport.height, it.box.y + it.box.height) - y };
      if (clip.width < 2 || clip.height < 2) continue;
      const { data, info } = await sharp(await page.screenshot({ clip })).raw().toBuffer({ resolveWithObject: true });
      const ls = [];
      for (let p = 0; p < data.length; p += info.channels) ls.push(lum(data[p], data[p + 1], data[p + 2]));
      ls.sort((a, b) => a - b);
      const [r, g, b] = it.color.match(/\d+(\.\d+)?/g).map(Number);
      const need = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700) ? 3 : 4.5;
      const got = ratio(lum(r, g, b), ls[Math.floor(ls.length * 0.95)]);
      if (got < need) failures.push(`${id} ${it.name}: ${got.toFixed(2)} < ${need}`);
    }
    await hide.evaluate((node) => node.remove());
    await page.evaluate(() => document.querySelectorAll('[data-cx]').forEach((n) => n.removeAttribute('data-cx')));
  }
  return failures;
}

const RUNS = [
  ['posters on a desktop', { width: 1440, height: 900 }, true, ''],
  ['posters on a phone', { width: 375, height: 812 }, true, ''],
  ['live worlds on a desktop', { width: 1440, height: 900 }, false, '?tier=high'],
  ['live worlds on a phone', { width: 375, height: 812 }, false, '?tier=high'],
];
for (const [name, viewport, reduced, query] of RUNS) {
  test.describe(name, () => {
    test.use({ viewport, contextOptions: reduced ? { reducedMotion: 'reduce' } : {} });
    test(`intro text meets AA contrast over ${name}`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.goto(`./${query}`);
      expect(await lowContrast(page, viewport, !reduced)).toEqual([]);
    });
  });
}
```

Add to `tests/unit/halcyon-transform.test.js`, and add `labelRailMark` to its import:

```js
it('puts the rail mark\'s visible text at the start of its label', () => {
  const html = '<a class="rail__mark" href="#sec-01" aria-label="Halcyon Somatics, back to top">H/S</a>';
  expect(labelRailMark(html)).toContain('aria-label="H/S: Halcyon Somatics, back to top"');
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/halcyon-transform.test.js`, then `npx playwright test tests/e2e/a11y.spec.js tests/e2e/contrast.spec.js`.

Expected:
- the transform test FAILS (not exported);
- axe FAILS on `color-contrast` (`.menu__soon`) with the menu open, and on `label-content-name-mismatch` (`.rail__mark`) in the HALCYON copy;
- the contrast test FAILS for `top hero__count` on a phone, over both the poster and the live world.

- [ ] **Step 3: Implement**

In `src/styles/ui.css:12`, change `.menu__soon { opacity: 0.45; }` to:

```css
.menu__soon { opacity: 0.6; } /* 5.1:1 on the menu's paper background; 0.45 gave 3.1:1 */
```

Add to `tools/lib/halcyon-transform.mjs`:

```js
// The rail's "H/S" mark is labelled "Halcyon Somatics, back to top", which doesn't contain the text you see, so
// someone using speech input can't say "click H/S" (WCAG 2.5.3). Put the visible text at the start of the label.
export function labelRailMark(html) {
  return html.replace('aria-label="Halcyon Somatics, back to top"', 'aria-label="H/S: Halcyon Somatics, back to top"');
}
```

In `tools/halcyon.mjs`, import `labelRailMark` with the others, and change line 21 to:

```js
await fs.writeFile(path.join(OUT, 'index.html'), labelRailMark(lockForm(swapFonts(html))));
```

Then run `npm run halcyon` to regenerate `public/halcyon/`. The tool reads `sources.local.json` and `raw/` itself; don't open either. `git diff --stat public/halcyon` must show only `index.html` changed, and `git diff public/halcyon/index.html` only the label. If anything else changed, stop and report NEEDS_CONTEXT rather than committing it.

Append to `src/styles/layout.css`:

```css
/* On narrow screens the hero's count and links sit over the busiest part of the ring, so the scrim reaches higher. */
@media (max-width: 700px) {
  .hero .scene__frame::before { background: linear-gradient(to top, rgba(9, 9, 9, 0.9), rgba(9, 9, 9, 0.8) 30%, rgba(9, 9, 9, 0) 65%); }
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run tests/unit/halcyon-transform.test.js`, then `npx playwright test tests/e2e/a11y.spec.js tests/e2e/contrast.spec.js tests/e2e/halcyon.spec.js tests/e2e/hero.spec.js`.

Expected: all pass.

If the phone hero still fails, raise the middle stop: first 0.85 at 30%, then 0.85 at 38%. Report the values that passed. Then screenshot the hero at 375×812 under `screens/` and confirm the ring still reads above the text.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/e2e/a11y.spec.js tests/e2e/contrast.spec.js src/styles/ui.css src/styles/layout.css tools/lib/halcyon-transform.mjs tools/halcyon.mjs tests/unit/halcyon-transform.test.js public/halcyon/index.html
git commit -m "fix: pass axe and AA contrast over posters and worlds, with axe-core as a dev-only check" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The privacy check over the whole history

**Files:**
- Create: `tools/lib/history-scan.mjs`
- Create: `tools/check-history.mjs`
- Create: `tests/unit/history-scan.test.js`
- Modify: `package.json` (script `"check:history": "node tools/check-history.mjs"`)
- Modify: `tools/capture-halcyon-video.mjs:32-33` (strip the encoder note on future recordings)
- Modify: `public/projects/halcyon-somatics/screen.mp4` (re-muxed, not re-encoded)

**Interfaces:**
- Consumes: `privacy.local.json`, read by the tool only, with the same `{ "forbidden": [...] }` shape `tests/unit/privacy.test.js` uses.
- Produces:
  - `scanHistory(cwd, words) → Promise<{ commits, textHits: string[], messageHits: number, imageHits: string[] }>`;
  - `npm run check:history`, which Part B runs before every push.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/history-scan.test.js`:

```js
import { it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { scanHistory } from '../../tools/lib/history-scan.mjs';

// A throwaway repo with its own identity, set through the environment (git config is never touched).
const ENV = { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-scan-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, env: ENV });
  git('init', '-q');
  const commit = (message) => { git('add', '-A'); git('commit', '-q', '-m', message); };
  return { dir, commit };
}

it('finds a word that only an old commit contains, and never returns the word', async () => {
  const { dir, commit } = repo();
  fs.writeFileSync(path.join(dir, 'notes.md'), 'made by Plumtree\n');
  commit('first');
  fs.writeFileSync(path.join(dir, 'notes.md'), 'made by Oscar\n');
  commit('second');
  const r = await scanHistory(dir, ['Plumtree']);
  expect(r.commits).toBe(2);
  expect(r.textHits).toHaveLength(1);
  expect(r.textHits[0]).toMatch(/^[0-9a-f]{40}:notes\.md$/);
  expect(JSON.stringify(r).toLowerCase()).not.toContain('plumtree');
});

it('counts private words in commit messages', async () => {
  const { dir, commit } = repo();
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hello\n');
  commit('fix for plumtree');
  expect((await scanHistory(dir, ['Plumtree'])).messageHits).toBe(1);
});

it('finds an old image that carried metadata', async () => {
  const { dir, commit } = repo();
  const file = path.join(dir, 'a.webp');
  await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).withMetadata({ exif: { IFD0: { Copyright: 'someone' } } }).webp().toFile(file);
  commit('with metadata');
  await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).webp().toFile(file);
  commit('clean');
  const r = await scanHistory(dir, ['plumtree']);
  expect(r.imageHits).toHaveLength(1);
  expect(r.imageHits[0]).toMatch(/^[0-9a-f]{7}:a\.webp$/);
});

it('reports nothing for a clean history', async () => {
  const { dir, commit } = repo();
  fs.writeFileSync(path.join(dir, 'a.txt'), 'made by Oscar\n');
  commit('first');
  const r = await scanHistory(dir, ['plumtree']);
  expect([r.textHits, r.messageHits, r.imageHits]).toEqual([[], 0, []]);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/history-scan.test.js`

Expected: FAIL on the missing module.

- [ ] **Step 3: Implement**

Create `tools/lib/history-scan.mjs`:

```js
// Scans everything a push publishes: every text file in every commit, every commit message and identity, and every
// image in full. Returns only commit:path locations and counts, never the words it found.
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const git = (cwd, args, opts = {}) => execFileSync('git', args, { cwd, maxBuffer: 256 << 20, ...opts });

export async function scanHistory(cwd, words) {
  const lower = words.map((w) => String(w).toLowerCase()).filter(Boolean);
  const revs = git(cwd, ['rev-list', '--all'], { encoding: 'utf8' }).split('\n').filter(Boolean);

  const textHits = new Set();
  for (let i = 0; lower.length && i < revs.length; i += 200) { // batches keep the command line short on Windows
    try {
      const out = git(cwd, ['grep', '-I', '-i', '-l', '-F', ...lower.flatMap((w) => ['-e', w]), ...revs.slice(i, i + 200)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      out.split('\n').filter(Boolean).forEach((line) => textHits.add(line)); // "<commit>:<path>"
    } catch (err) {
      if (err.status !== 1) throw err; // git grep exits 1 when nothing matches
    }
  }

  const log = git(cwd, ['log', '--all', '--format=%an%n%ae%n%cn%n%ce%n%B'], { encoding: 'utf8' }).toLowerCase();
  const messageHits = lower.filter((w) => log.includes(w)).length;

  const imageHits = [];
  const seen = new Set();
  for (const line of git(cwd, ['rev-list', '--objects', '--all'], { encoding: 'utf8' }).split('\n')) {
    const space = line.indexOf(' ');
    if (space < 0) continue;
    const sha = line.slice(0, space);
    const file = line.slice(space + 1);
    if (seen.has(sha) || !/\.(webp|png|jpe?g)$/i.test(file)) continue;
    seen.add(sha);
    const meta = await sharp(git(cwd, ['cat-file', 'blob', sha])).metadata();
    if (meta.exif || meta.xmp || meta.iptc) imageHits.push(`${sha.slice(0, 7)}:${file}`);
  }

  return { commits: revs.length, textHits: [...textHits], messageHits, imageHits };
}
```

Create `tools/check-history.mjs`:

```js
// npm run check:history: run before every push. A push publishes every past commit, not just today's files. This
// reads privacy.local.json itself and prints only where a private word turned up, never the word.
import fs from 'node:fs';
import { scanHistory } from './lib/history-scan.mjs';

if (!fs.existsSync('privacy.local.json')) {
  console.error('privacy.local.json is missing; the history check needs its word list.');
  process.exit(1);
}
const { forbidden = [] } = JSON.parse(fs.readFileSync('privacy.local.json', 'utf8'));
if (!forbidden.length) {
  console.error('privacy.local.json lists no words.');
  process.exit(1);
}
const r = await scanHistory('.', forbidden);
console.log(`${r.commits} commits checked against ${forbidden.length} private words.`);
if (r.textHits.length) console.error(`A private word appears in ${r.textHits.length} file versions:\n  ${r.textHits.slice(0, 20).join('\n  ')}`);
if (r.messageHits) console.error(`${r.messageHits} private word(s) appear in commit messages or identities.`);
if (r.imageHits.length) console.error(`Images in history carry metadata:\n  ${r.imageHits.join('\n  ')}`);
if (r.textHits.length || r.messageHits || r.imageHits.length) process.exit(1);
console.log('History clean: no private words and no image metadata in any commit.');
```

Add the script to `package.json`, after `"check:media"`: `"check:history": "node tools/check-history.mjs",`.

**HALCYON video.** Re-mux `public/projects/halcyon-somatics/screen.mp4` without re-encoding, using the same filters the ASCII demo's tool uses:

```bash
node -e "require('child_process').execFileSync(require('ffmpeg-static'), ['-y','-i','public/projects/halcyon-somatics/screen.mp4','-map','0','-c','copy','-bsf:v','filter_units=remove_types=6','-map_metadata','-1','-fflags','+bitexact','-movflags','+faststart','screens/screen-clean.mp4'], { stdio: 'inherit' })"
```

Check that `screens/screen-clean.mp4` no longer contains the bytes `x264 - core` (for example `grep -c -a "x264 - core" screens/screen-clean.mp4` gives 0) and still plays. Then copy it over `public/projects/halcyon-somatics/screen.mp4`.

In `tools/capture-halcyon-video.mjs:32-33`, add `'-bsf:v', 'filter_units=remove_types=6', '-fflags', '+bitexact'` before `'-movflags'` in the encode's argument list, so a future re-recording stays clean. It already has `-map_metadata -1`. Don't re-record.

- [ ] **Step 4: Run the tests, then the real check**

Run: `npx vitest run tests/unit/history-scan.test.js`. Expected: 4 passed.

Run: `npm run check:history`. It prints how many commits and words it checked, and must end with "History clean". If it reports hits, stop and report them as BLOCKED (paths only). History is Oscar's decision in Part B.

Run: `npm test`, then `npx playwright test tests/e2e/video.spec.js tests/e2e/halcyon-world.spec.js`.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/history-scan.mjs tools/check-history.mjs tests/unit/history-scan.test.js package.json tools/capture-halcyon-video.mjs public/projects/halcyon-somatics/screen.mp4
git commit -m "feat: add npm run check:history for every commit a push publishes, and strip the HALCYON video's encoder note" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Deploy setup

**Files:**
- Modify: `.github/workflows/deploy.yml` (Node 22, actions pinned to commit SHAs, checks before the build)
- Create: `tests/unit/workflow.test.js`
- Modify: `plugins/chapters.js:52` (case-exact file check) and add `existsExactly`
- Modify: `tests/unit/chapters-plugin.test.js`
- Modify: `playwright.config.js` (`PW_BASE_URL` for checking the live site)
- Modify: `package.json` (script `"preview:phone"`)
- Modify: `CLAUDE.md` (commands, a Publishing section, `?fps`)

**Interfaces:**
- Consumes: `npm run check:history` from Task 7.
- Produces: `existsExactly(root, rel) → boolean`, the `PW_BASE_URL` switch, and `npm run preview:phone`. Part B uses all three.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/workflow.test.js`:

```js
import { it, expect } from 'vitest';
import fs from 'node:fs';

const yml = fs.readFileSync('.github/workflows/deploy.yml', 'utf8').replace(/\r\n/g, '\n'); // CRLF on Windows checkouts

it('pins every action to a full commit SHA', () => {
  const uses = [...yml.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  expect(uses).toHaveLength(4);
  for (const u of uses) expect(u).toMatch(/^actions\/[\w-]+@[0-9a-f]{40}$/);
});

it('builds on Node 22 and runs the checks and unit tests before building', () => {
  expect(yml).toMatch(/node-version:\s*22\b/);
  const order = ['npm ci', 'npm run check', 'npm run check:media', 'npm test', 'npm run build'].map((s) => yml.indexOf(`run: ${s}\n`));
  expect(order.every((i) => i > 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});
```

Add to `tests/unit/chapters-plugin.test.js`, and add `existsExactly` to its import from `../../plugins/chapters.js`. Add `fs`, `os` and `path` imports if missing:

```js
it('treats a path with the wrong letter case as missing, as GitHub Pages would', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exact-'));
  fs.mkdirSync(path.join(root, 'projects', 'demo'), { recursive: true });
  fs.writeFileSync(path.join(root, 'projects', 'demo', 'cover.webp'), '');
  expect(existsExactly(root, 'projects/demo/cover.webp')).toBe(true);
  expect(existsExactly(root, '/projects/demo/cover.webp')).toBe(true);
  expect(existsExactly(root, 'projects/demo/Cover.webp')).toBe(false);
  expect(existsExactly(root, 'Projects/demo/cover.webp')).toBe(false);
  expect(existsExactly(root, 'projects/demo/missing.webp')).toBe(false);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run tests/unit/workflow.test.js tests/unit/chapters-plugin.test.js`

Expected:
- `workflow.test.js` FAILS: tags like `@v4` instead of SHAs, and Node 20;
- `existsExactly` FAILS (not exported).

- [ ] **Step 3: Implement**

Replace `.github/workflows/deploy.yml` with the content below. These are the latest releases as of 20 Nov 2026. Each SHA is the commit that the tag in its comment points to, and all four run on Node 24.

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
        env:
          FFMPEG_BIN: /bin/true
      - run: npm run check
      - run: npm run check:media
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1
```

In `plugins/chapters.js`, add (it already imports `fs` and `path`):

```js
// True only if rel exists under root with exactly this spelling. GitHub Pages is case-sensitive and Windows isn't,
// so "Cover.webp" passes fs.existsSync here and 404s on the live site.
export function existsExactly(root, rel) {
  let dir = root;
  for (const part of rel.split('/').filter(Boolean)) {
    let names;
    try { names = fs.readdirSync(dir); } catch { return false; }
    if (!names.includes(part)) return false;
    dir = path.join(dir, part);
  }
  return fs.existsSync(dir);
}
```

Change line 52's `fileExists` to `fileExists: (rel) => existsExactly(publicDir, rel)`.

In `playwright.config.js`:
- add `const live = process.env.PW_BASE_URL; // e.g. https://itsoscar-69.github.io/ to check the published site`;
- set `baseURL: live || \`http://localhost:4173${BASE}\``;
- replace the `webServer: {…}` entry with a spread, so checking the live site starts no local server:

  ```js
  ...(live ? {} : { webServer: { command: 'npm run build && npm run preview', url: `http://localhost:4173${BASE}`, reuseExistingServer: false, timeout: 180_000 } }),
  ```

Add to `package.json` scripts, after `"preview"`: `"preview:phone": "vite build && vite preview --host --port 4173 --strictPort",`.

In `CLAUDE.md`:
- **Command rows:**
  - `npm run check:history`: run before every push. It checks every commit for the words in `privacy.local.json` and every past image for metadata.
  - `npm run preview:phone`: builds and serves the site on the local network, so a phone on the same Wi-Fi can open the Network URL it prints. The camera mirror needs https, so it says it is unavailable there.
- **One line under "How it fits together":** `?fps` shows a frame-rate readout with the device tier.
- **A new section after "How it fits together":**

  ```markdown
  ## Publishing

  - Every push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, `npm run check`, `npm run check:media`, `npm test`, `npm run build`, then GitHub Pages. The actions are pinned to commit SHAs; update them on purpose, with the tag in the comment.
  - The repo's Settings → Pages → Source must be "GitHub Actions".
  - Before any push, run `npm run check:history`. A push publishes every past commit, not just the current files.
  - Check the live site with `PW_BASE_URL=https://itsoscar-69.github.io/ npx playwright test tests/e2e/site.spec.js tests/e2e/halcyon.spec.js`.
  ```

Keep the file's voice. Don't change the Status paragraph yet; Part B updates it after the first publish.

- [ ] **Step 4: Run everything**

Run: `npm test`, `npm run check` and `npm run check:media`. Then `npx vite build --outDir screens/ci-dist` to confirm the build still works with the case-exact check, and delete `screens/ci-dist` afterwards.

Then run the full e2e suite once (`npm run test:e2e`, in the background with a long timeout): it covers every task in Part A.

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml tests/unit/workflow.test.js plugins/chapters.js tests/unit/chapters-plugin.test.js playwright.config.js package.json CLAUDE.md
git commit -m "chore: pin the deploy workflow's actions to SHAs on Node 22, check file case like Pages does, and document publishing" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part B: launch review and first publish (controller and Oscar only)

Never dispatch Part B to a subagent. Every step that leaves this PC (creating the repo, changing a GitHub setting, adding a remote, pushing) waits for Oscar's explicit go-ahead at that moment. The controller never types a GitHub password or token; Git Credential Manager asks Oscar to sign in.

### B0: Oscar's decisions (ask when the plan is reviewed; the publish waits on them)

1. **School name.** The privacy word list still lacks Oscar's school. Oscar adds it himself to the `"forbidden"` list in `privacy.local.json` (the controller never opens that file). Then `npm test` and `npm run check:history` run with it.
2. **History.** Choose one before the first push:
   - **(a) Publish the full history (recommended).** All commits so far show the site being built step by step, each co-authored. `npm run check:history` must pass. The milestone 1–5 plan documents keep their `C:\Users\Oscar\...` working-folder lines (first name only, which the rules allow), and the first demo video with x264's encoder settings stays in history.
   - **(b) Publish one fresh commit of the finished site.** It hides the process, and the controller removes the working-folder lines from the plan documents first.
3. **Commit trailers.** Every commit says "Co-Authored-By: Claude Opus 5.5" even where a Sonnet or Haiku subagent wrote the code. Either keep it (recommended), or rewrite the trailers before the first push. That is only possible now, and it changes every commit hash.

### B1: Launch review

1. Merge Part A to `main` the usual way: final review, Oscar's sign-off, then finishing-a-development-branch.
2. Run `npm test && npm run test:e2e && npm run check && npm run check:media && npm run check:history`. All must pass.
3. **Copy review (spec §11).**
   - The controller pulls all visible copy from the built `index.html` into one sheet for Oscar: each chapter's meta, title, hook, panel text, captions and alt text, plus the hero, next slot, footer and menu.
   - Oscar approves it or edits it. Copy changes go in as one commit.
   - Open questions to ask Oscar at the same time:
     - keep or reword "for my art class";
     - recapture the clipped SERAPH-9 screenshot;
     - trim the black first second of the HALCYON video.
4. **Screenshots** at 1440×900, 375×812, 812×375 and 768×1024 (the `screens.spec.js` set plus the two new sizes), sent to Oscar.
5. **Real-phone check (spec §9).**
   - Run `npm run preview:phone`, and Oscar opens the Network URL it prints on his phone, on the same Wi-Fi.
   - If Windows asks, allow Node.js on private networks only.
   - Oscar checks:
     - every chapter, held upright and sideways;
     - each chapter's `?fps` reading (aim for at least 30);
     - the pill and menu blur;
     - tapping parts in the model viewer;
     - the demo videos;
     - reduced motion, if his phone has it on.
   - Expected there: the mirror says the camera isn't available. A local-network address isn't https, so browsers hide the camera. The mirror is checked on the live site in B2.
6. Anything found becomes one fix round (a subagent with a brief), followed by a re-check. Oscar signs off the launch.

### B2: First publish

1. **Oscar creates the repo** on github.com: owner `ItsOscar-69`, name `ItsOscar-69.github.io`, Public, with no README, licence or .gitignore.
2. **Oscar sets the Pages source:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. **Only if Oscar chose B0 2(b), make one fresh commit:**
   - `git checkout --orphan publish`, then replace each `C:\Users\Oscar\Downloads\portfolio` path in `docs/superpowers/` with a repo-relative one;
   - commit everything once, with the trailer;
   - run `npm run check:history` (it now sees `publish` too), then push with `git push -u origin publish:main` in step 4.
4. **Push.**
   - Run `npm run check:history` one last time, then `git remote add origin https://github.com/ItsOscar-69/ItsOscar-69.github.io.git`.
   - With Oscar's go-ahead, run `git push -u origin main`. Git Credential Manager opens GitHub's sign-in for Oscar.
5. **Watch the run** at `https://github.com/ItsOscar-69/ItsOscar-69.github.io/actions` in the browser pane.
   - If `npm ci`, a check or the build fails, fix it locally and push again, with a go-ahead.
   - If only the upload or deploy steps fail, pin the previous pair instead: `actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b # v4.0.0` and `actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4.0.5`. Then push again, with a go-ahead.
6. **Check the live site:** run `PW_BASE_URL=https://itsoscar-69.github.io/ npx playwright test tests/e2e/site.spec.js tests/e2e/halcyon.spec.js` (no console errors, every chapter renders, no third-party requests), then open it in the browser pane.
7. **Oscar on his phone** at `https://itsoscar-69.github.io/`:
   - Try the mirror, allow the camera, and check that "Camera on" shows and Stop works;
   - scroll on and check that the camera stops;
   - give the site a final look, on iPhone Safari if he has one.
8. **Wrap up.**
   - Update CLAUDE.md's Status paragraph to say the site is live at https://itsoscar-69.github.io/, deployed on every push to `main`.
   - Commit it, run `npm run check:history`, and push with a go-ahead.
   - Update memory.

---

## After launch (deferred on purpose; none blocks the first publish)

- **Model viewer:** keyboard orbit. The part list already gives keyboard access to every part.
- **Mirror:** in Safari a mouse click doesn't focus Stop, so focus isn't moved back to Start.
- **Pico:**
  - single-frame event highlights can be missed at 30 fps;
  - the page loop runs while paused;
  - the halo point size isn't clamped to the GPU's maximum (GPUs clamp it themselves);
  - 1px speckles on some bead rims;
  - hovering the code box pauses auto-follow;
  - the live code `pre` has no accessible label (axe doesn't flag it).
- **Layers world:**
  - a fill layer must be the back layer;
  - `npm run check` doesn't parse `layers.json`;
  - `publish-layers` is hard-coded to DEAD TIRED;
  - "Adding a project" doesn't mention the layers world;
  - the world reads an undocumented `options.seed`.
- **Near-square windows (about 1000×900):**
  - DEAD TIRED's title touches the print;
  - the ASCII Mirror meta line crosses the model;
  - at 1024×768 the print just touches the title.
- **Content tooling:** validate out-of-range code `lines`, and harden the SVG import in `svg-lines.js`.
- **Milestone 5 test nits:**
  - a missing space in one test's signature;
  - the viewer fallback tests accept any "keeping the poster" warning;
  - the text-mirror test doesn't assert that the `<pre>` sits above the poster.
- **A README** for the repo.
