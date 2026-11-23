# Portfolio Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the portfolio before its first publish, so nothing moves before you can see it and nothing looks generic or out of place.

**Architecture:** Six small tasks on branch `polish-pass`:
- **Task 2:** adds one shared pure helper, `isFullyInView` in `src/lib/in-view.js`, used by both the video player and the Pico code box.
- **Task 5:** rewrites the HALCYON video tool. It records the page's boot sequence (real time), then the HALCYON world (frame by frame under Playwright's fake clock), and joins them with ffmpeg.
- **The rest** are CSS, content and generated-media changes.

**Tech Stack:** Vite 6.4.1, three.js 0.181.0, Playwright 1.61.1 (Edge, SwiftShader), sharp 0.32.6, ffmpeg-static 5.2.0, Vitest 3.2.4. Node 18.16 locally.

**Spec:** `docs/superpowers/specs/2026-11-24-portfolio-polish-design.md`. Its "New copy" strings are exact. The parent spec is `docs/superpowers/specs/2026-11-16-portfolio-design.md`.

## Global Constraints

- **Name:** the first name "Oscar" only. No surname, school, state, assignment name or email in any file or commit message.
- **Git identity:** commit with the existing git identity. Never change git config, never push, never add a remote.
- **Commit trailer:** every commit message ends with a second `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- **Private files:** never open, print or copy `privacy.local.json` or `sources.local.json`. Tools may read them. Never commit `raw/`, `screens/` or `.superpowers/`.
- **Local paths:** never write a local path from outside the repo into any file.
- **Third parties:** the built site makes no third-party requests.
- **Dependencies:** none new.
- **Media metadata:**
  - every MP4 is H.264 with no audio and no metadata, with the x264 settings note stripped (`-bsf:v filter_units=remove_types=6 -map_metadata -1 -fflags +bitexact`);
  - every WebP has no metadata.
- **Copy:** only the strings in the spec's "New copy" list change. Everything else stays word for word.
- **Live HALCYON page:** `public/halcyon/` doesn't change.
- **Branch:** `polish-pass`, from `main` at 0743af6.

## Review Focus

1. **Reduced motion:** nothing autoplays, both videos show "Play", and the code box jumps to the running line with no glide. *Pinned in Task 2 Step 1 and Task 3 Step 1.*
2. **Short screens (a sideways phone, 812×375):** the 540 px code box can never be fully on screen, so it must still follow once it fills 90% of the screen's height. *Pinned in Task 3 Step 1.*
3. **Keyboard and screen readers:** with the browser's controls gone, a keyboard user must still be able to pause and play each video. *Pinned in Task 2 Step 1.*
4. **Paused stays paused:** a video the visitor paused stays paused after scrolling away and back, and isn't restarted. *Pinned in Task 2 Step 1.*
5. **Hidden data in the new video:** it must carry no metadata or encoder note, but `check:media` only checks images. *Pinned in Task 5 Step 1.*

---

### Task 1: Tab title, the HALCYON link, the cards

**Files:**
- Modify: `index.html:6` (the `<title>`)
- Modify: `src/content/projects.js:47` (delete the `{ type: 'link', … }` media entry)
- Modify: `src/styles/chapter.css` (the `.panel__links a` rule at line 15, and the `.card h4` / `.card p` rules)
- Test: `tests/e2e/smoke.spec.js:5`, `tests/e2e/content.spec.js`

**Interfaces:** none new. Keep `renderMedia`'s `link` type, which the TEMPLATE and the unit tests still use.

- [ ] **Step 1: Write the failing tests**

In `smoke.spec.js:5`, change the title expectation to `'Portfolio'`.

Add to `content.spec.js`:

```js
test('the HALCYON write-up has no big link tile, and its live-page link is a pill button', async ({ page }) => {
  await page.goto('./?posters');
  const panel = page.locator('#halcyon-somatics .chapter__panel');
  await expect(panel.locator('.media--link')).toHaveCount(0);
  const link = panel.locator('.panel__links a', { hasText: 'Visit the live page' });
  await expect(link).toHaveAttribute('href', '/halcyon/');
  const style = await link.evaluate((a) => { const s = getComputedStyle(a); return { radius: parseFloat(s.borderTopLeftRadius), border: s.borderTopStyle, underline: s.textDecorationLine }; });
  expect(style.radius).toBeGreaterThan(100);
  expect(style.border).toBe('solid');
  expect(style.underline).toBe('none');
});

test('card labels use the small spaced mono capitals of the intro top line', async ({ page }) => {
  await page.goto('./?posters');
  const label = await page.locator('.card h4').first().evaluate((h) => { const s = getComputedStyle(h); return { transform: s.textTransform, family: s.fontFamily, size: parseFloat(s.fontSize) }; });
  expect(label.transform).toBe('uppercase');
  expect(label.family).toMatch(/JetBrains Mono/);
  expect(label.size).toBeLessThanOrEqual(12);
});
```

- [ ] **Step 2: Run and see them fail**

Run: `npx playwright test tests/e2e/smoke.spec.js tests/e2e/content.spec.js`

Expected: three failures:
- the title (`Oscar — Built with Claude Code`);
- the `.media--link` count (1);
- the card label transform (`none`).

- [ ] **Step 3: Implement**

1. `<title>Portfolio</title>`. Leave the hidden `<h1>` and the meta description alone.
2. Delete the HALCYON `{ type: 'link', src: '/halcyon/', caption: 'Open the live HALCYON page' }` media entry.
3. **`.panel__links a`** becomes an outlined pill:
   - `display: inline-flex; gap: 8px; padding: 9px 16px; border: 1px solid var(--faint); border-radius: 999px`;
   - `color: var(--paper); text-decoration: none; font: 500 12px/1 var(--font-mono); letter-spacing: 0.04em`;
   - an `::after { content: '↗'; }`;
   - a `:hover` / `:focus-visible` border of `var(--paper)`.

   This matches `.mirror button` (`chapter.css:45`).
4. **`.card h4`:** `margin: 0 0 10px; font: 500 11px/1.3 var(--font-mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted)`.
5. **`.card p`:** `color: var(--paper); line-height: 1.55`.

- [ ] **Step 4: Run the tests and look**

Run: `npx playwright test tests/e2e/smoke.spec.js tests/e2e/content.spec.js tests/e2e/a11y.spec.js tests/e2e/contrast.spec.js tests/e2e/layout.spec.js`

Expected: all pass. Run `npm test` and `npm run check`.

Screenshot the HALCYON and Pico panels at 1440×900 and 375×812 under `screens/`, and report how the cards and the pill look.

- [ ] **Step 5: Commit**

```bash
git add index.html src/content/projects.js src/styles/chapter.css tests/e2e/smoke.spec.js tests/e2e/content.spec.js
git commit -m "feat: title the tab Portfolio, swap the big HALCYON link tile for a pill link, and restyle the cards" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: A quiet video player that waits until it's fully on screen

**Files:**
- Create: `src/lib/in-view.js`
- Test: `tests/unit/in-view.test.js`
- Modify: `src/content/render.js:41` (drop `controls` from the `<video>` markup)
- Modify: `src/ui/media.js` (thresholds, restart, Pause/Play button)
- Modify: `src/styles/chapter.css` (`.media--video` positioning and the `.media__toggle` button)
- Test: `tests/e2e/video.spec.js`, `tests/unit/render.test.js`

**Interfaces:**
- Produces: `isFullyInView(entry: { intersectionRatio: number, intersectionRect: { height: number }, rootBounds: { height: number } | null }, minFill = 0.9) → boolean`. It's true when `intersectionRatio >= minFill`, or when the visible part fills at least `minFill` of the viewport's height (for elements taller than the screen). A null `rootBounds` gives false.
- Produces: each `video[data-autoplay]` gets a sibling `<button type="button" class="media__toggle">` inside its `<figure>`.
  - Text `Pause` or `Play`, and `aria-label` `Pause the video` or `Play the video`, kept in step with the video's `play` and `pause` events.
  - Task 3 consumes `isFullyInView`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/in-view.test.js`:

```js
import { it, expect } from 'vitest';
import { isFullyInView } from '../../src/lib/in-view.js';

const e = (ratio, visible, viewport) => ({ intersectionRatio: ratio, intersectionRect: { height: visible }, rootBounds: viewport === null ? null : { height: viewport } });

it('is true once 90% of the element is visible', () => {
  expect(isFullyInView(e(0.95, 500, 900))).toBe(true);
  expect(isFullyInView(e(0.6, 300, 900))).toBe(false);
});
it('counts an element taller than the screen as in view once it fills 90% of the screen height', () => {
  expect(isFullyInView(e(0.7, 350, 375))).toBe(true);
  expect(isFullyInView(e(0.5, 250, 375))).toBe(false);
});
it('is false without a root', () => {
  expect(isFullyInView(e(1, 500, null))).toBe(false);
});
```

In `tests/unit/render.test.js`, add: the video markup contains `data-autoplay` and does **not** contain `controls`.

In `tests/e2e/video.spec.js`, rework the existing tests and add new ones. Use a helper that scrolls a video so a given fraction of it is visible at the bottom of the screen:

```js
const showFraction = (page, sel, f) => page.evaluate(([s, frac]) => {
  const v = document.querySelector(s); const r = v.getBoundingClientRect();
  window.scrollTo(0, window.scrollY + r.top - (innerHeight - r.height * frac));
}, [sel, f]);
```

Tests (`#halcyon-somatics video` unless named otherwise):
- `'no browser player: the video has no controls, and a Pause button sits on it'`:
  - `await expect(video).not.toHaveAttribute('controls')`;
  - after it plays, the figure's `.media__toggle` has text `Pause` and `aria-label` `Pause the video`.
- `'it waits until the video is fully on screen, then plays from the start'`: at `showFraction(…, 0.6)`, wait 1.5 s and expect `paused === true` and `currentTime === 0`. Then scroll it fully into view (`scrollIntoView({ block: 'center' })`) and `expect.poll(() => paused).toBe(false)`.
- `'scrolling away and back starts it again from the beginning'`:
  1. Play until `currentTime > 1.5`.
  2. Scroll to `#dead-tired` and expect `paused`.
  3. Scroll back to center the video and poll for `!paused && currentTime < 1`.
- `'a video the visitor paused stays paused when they scroll back'` (rework the existing test): pause with the **toggle button**, scroll away and back, wait 1.5 s, and expect it still paused, with the button reading `Play`.
- `'keyboard: the toggle pauses and plays'`: focus the toggle, press Enter, and expect `paused`; press Enter again, and expect playing.
- With reduced motion (rework the existing describe): it never starts by itself, the toggle reads `Play`, and clicking it starts playback.
- `'the ASCII demo recording has the same player'` (rework the existing test): no `controls`, and it plays once fully on screen.

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run tests/unit/in-view.test.js tests/unit/render.test.js`, then `npx playwright test tests/e2e/video.spec.js`.

Expected: FAIL. The module is missing, the markup has `controls`, and there is no `.media__toggle`.

- [ ] **Step 3: Implement**

- **`src/lib/in-view.js`:** as the Interfaces block says.
- **`render.js`:** remove ` controls` from the video template.
- **`media.js` → `autoplayVideos(doc, { reduced })`** (same export, same call in app.js):
  - Use an IntersectionObserver with thresholds `[0, 0.25, 0.5, 0.75, 0.9, 1]`.
  - Play when `isFullyInView(entry)` and the visitor hasn't paused it. If the video fully left the screen since it last played (an entry with `intersectionRatio === 0`), set `currentTime = 0` first.
  - Pause (as "paused by us") when `intersectionRatio < 0.25`.
  - Keep the existing paused-by-visitor rule, which now covers toggle clicks.
  - Create the toggle button for every `video[data-autoplay]`, including under reduced motion and without IntersectionObserver.
  - Clicking it plays or pauses the video.
- **CSS:**
  - `.media--video { position: relative; }`;
  - `.media__toggle` sits at the video's bottom-left corner (`position: absolute; left: 12px; bottom: <caption-safe>`), so it's over the video, not the caption;
  - it uses the `.mirror button` pill look on a `rgba(2, 6, 4, 0.7)` background.

  Simplest placement: wrap the toggle and the video in a `.media__frame` div created by media.js, with `position: relative`, and put the toggle at `left: 12px; bottom: 12px`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run tests/unit/in-view.test.js tests/unit/render.test.js` and `npx playwright test tests/e2e/video.spec.js tests/e2e/a11y.spec.js tests/e2e/layout.spec.js`. Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/in-view.js tests/unit/in-view.test.js src/content/render.js src/ui/media.js src/styles/chapter.css tests/e2e/video.spec.js tests/unit/render.test.js
git commit -m "feat: replace the browser video player with a Pause/Play pill, and play only once fully on screen, from the start" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The Pico code box holds still until it's fully on screen, then glides

**Files:**
- Modify: `src/ui/light-show.js:72-94` (the reading flags and `reveal`), plus a visibility observer on the `<pre>`
- Test: `tests/e2e/pico-ui.spec.js`

**Interfaces:** consumes `isFullyInView(entry, minFill = 0.9)` from `src/lib/in-view.js` (Task 2). `createLightShow({ doc, reduced })` is unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `pico-ui.spec.js`:
- `'the code box holds still while it slides in, then glides to the running line once fully on screen'`:
  1. Scroll so the `.media--code pre` shows only its top 40% at the bottom of the screen.
  2. Record `scrollTop`, wait 3 s while the show plays, and expect `scrollTop` unchanged.
  3. Scroll the box fully into view (`block: 'center'`).
  4. `expect.poll` that the `.code-line.is-running` element lies within the box's visible area (its `offsetTop` between `scrollTop` and `scrollTop + clientHeight`), within 3 s.
- `'on a sideways phone (812×375) the box still follows once it fills the screen'`: at viewport 812×375, scroll the box's top to the top of the screen, and poll that the running line is within the visible area.
- In the existing reduced-motion describe: after pressing Play with the box fully on screen, the box reaches the running line **without** smooth scrolling. Assert `getComputedStyle(pre).scrollBehavior !== 'smooth'`, and poll that the line is in view within 1 s.

Keep the existing tests. Where one asserts scroll position right after a chip click, change it to `expect.poll`, because the glide takes time.

- [ ] **Step 2: Run and see them fail**

Run: `npx playwright test tests/e2e/pico-ui.spec.js`

Expected: the "holds still" test FAILS, because `scrollTop` changes while the box is partly visible.

- [ ] **Step 3: Implement**

In `light-show.js`:
- Add `let boxInView = false` and an IntersectionObserver on `pre`, with thresholds `[0, 0.25, 0.5, 0.75, 0.9, 1]`. It sets `boxInView = isFullyInView(entry)`. When the box becomes fully in view, call `reveal(lineEls.get(shownLine) || lineEls.get(byName[shownEffect].lines[0]), false)`.
- `reveal` returns early unless `boxInView`, as well as when `reading()`.
- Replace the `pre.scrollTop = …` write with `pre.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })`, where `top` is the same value.
- Update the comment block to say the box waits until it's fully on screen.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx playwright test tests/e2e/pico-ui.spec.js tests/e2e/pico-world.spec.js`, then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/light-show.js tests/e2e/pico-ui.spec.js
git commit -m "fix: let the Pico code box wait until it is fully on screen, then glide to the running line" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Recapture SERAPH-9 without the overlap, and re-render the HALCYON posters

**Files:**
- Modify: `tools/capture-halcyon.mjs` (the SERAPH-9 capture picks a viewport where the side-effects card doesn't cover the plate)
- Modify: `public/projects/halcyon-somatics/shot-seraph.webp`, `shot-seraph-900.webp`
- Modify: `public/posters/halcyon-somatics.webp`, `halcyon-somatics-portrait.webp` (and any other poster whose bytes change)

**Interfaces:** none. The HALCYON world reads `shot-seraph-900.webp` as a floating panel (`src/content/projects.js:33`), so its posters change.

- [ ] **Step 1: Make the tool check the overlap and fail on it**

In `public/halcyon/index.html` section `#sec-02`, find:
- the SERAPH-9 spec plate (the panel holding "REACTION TIME" and "RECALL FIDELITY");
- the "Known side effects" warning card.

In `capture-halcyon.mjs`, for the SERAPH-9 shot only, try viewports `[1600×1000, 1920×1200, 1440×900, 1280×800]`, all 16:10, in order:
1. Scroll `#sec-02` into view (`block: 'start'`) and wait 2 s.
2. Read both elements' bounding boxes. Use the first viewport where they don't intersect and both lie fully inside the viewport.
3. Throw `SERAPH-9 overlaps at every viewport tried` if none qualifies.

Hero and terms keep 1600×1000.

- [ ] **Step 2: Run it and publish**

Run: `node tools/capture-halcyon.mjs`, then `node tools/publish-media.mjs`. Both read `raw/`; publish-media converts raw/shots and raw/covers into WebP without metadata.

Expected: the tool prints which viewport it used for SERAPH-9.

Check the result:
- `git status public/projects` should show only the `shot-seraph*` files changed. If other files changed and look the same, restore them with `git checkout -- <file>`.
- Look at the new `shot-seraph.webp` and confirm the plate's numbers ("+340%", "99.2%", "12", "1.5 H") are all uncovered.

If no viewport works, report BLOCKED with the boxes measured.

- [ ] **Step 3: Re-render the posters**

Run: `npm run posters` (several minutes; run it in the background).

Expected: `halcyon-somatics.webp` and `halcyon-somatics-portrait.webp` change. Look at both. Restore any other changed poster that looks the same.

Run `npm test` and `npm run check:media`.

- [ ] **Step 4: Commit**

```bash
git add tools/capture-halcyon.mjs public/projects/halcyon-somatics/shot-seraph.webp public/projects/halcyon-somatics/shot-seraph-900.webp public/posters
git commit -m "fix: recapture SERAPH-9 so the side-effects card no longer covers its numbers, and re-render the HALCYON posters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The HALCYON video: start-up sequence, then the 3D body

**Files:**
- Modify: `tools/capture-halcyon-video.mjs` (rewrite)
- Modify: `package.json` (`"video:halcyon": "vite build && node tools/capture-halcyon-video.mjs"`)
- Modify: `public/projects/halcyon-somatics/screen.mp4`, `screen-poster.webp`
- Modify: `src/content/projects.js:43` (the video's `alt` and `caption`, exactly as in the spec)
- Modify: `CLAUDE.md` (the `npm run video:halcyon` row)
- Create: `tests/unit/video-metadata.test.js`

**Interfaces:** consumes the built site in `dist/`, served by `tools/lib/static-server.mjs` `serveDir('dist')`. It also uses the HALCYON chapter (`#halcyon-somatics`) with `?tier=high`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/video-metadata.test.js`. For each of `public/projects/halcyon-somatics/screen.mp4` and `public/projects/ascii-mirror/demo.mp4`, read the bytes as latin1 and expect none of these:
- `x264 - core`
- `©too`
- `©nam`
- `©day`
- `location`
- `soun`, an audio track's handler type

Run: `npx vitest run tests/unit/video-metadata.test.js`

Expected: FAIL on `screen.mp4`'s `©too`. Milestone 6 stripped the x264 note but kept the muxer's tool tag. If it passes, it guards the new file.

- [ ] **Step 2: Rewrite the recording tool**

`tools/capture-halcyon-video.mjs` serves `dist/` and launches Edge through `tools/lib/browser.mjs`. Then:

**Part 1, the start-up, in real time:**
1. Create a context at 1280×800 with `recordVideo` (size 1280×800), and note `t0 = Date.now()` at `newPage()`.
2. Go to `/halcyon/` (fresh session, so the boot plays). Wait for `!document.documentElement.classList.contains('booting')` (the boot ends where `public/halcyon/main.js:84` removes `booting`), and note `t1`.
3. Wait 0.4 s and close the context.
4. Use `cut = (t1 - t0) / 1000 + 0.4` seconds.

**Part 2, the 3D body, frame by frame:**
1. Create a new context at 1280×800 and run `await page.clock.install()` before `goto('/?tier=high')`.
2. Add a stylesheet that hides everything but the stage: `.topbar, .pill, .menu, .skip, main .scene__frame > *, .scene__frame::before { visibility: hidden !important; }`.
3. Scroll to the HALCYON scene's start plus 0.45 of its intro length, as `screens.spec.js` computes it.
4. `runFor` in 100 ms steps until `#halcyon-somatics` has `is-live`, then a further 2000 ms.
5. Capture 180 frames, i.e. 6 s at 30 fps. Before each frame, move the mouse so the pointer sweeps from x = 30% to x = 70% of the width, at y = 50%. Then `await page.clock.runFor(1000 / 30)` and screenshot `canvas.stage` to `raw/video/frames/f%04d.png`.
6. If `page.clock` turns out not to drive the stage's `requestAnimationFrame` (the frames don't change), stop and report NEEDS_CONTEXT. Don't swap in real-time recording.

**Joining, with ffmpeg-static:**
1. Find the leading black in Part 1 with `blackdetect=d=0.1:pix_th=0.10`, parsing `black_end` from stderr where `black_start` is 0. Trim Part 1 to `[black_end, cut]` at 30 fps, scaled to 1280 wide.
2. Build Part 2 from the frames at 30 fps.
3. Join them with `xfade=transition=fade:duration=0.6:offset=<part1 length − 0.6>`, and fade the last 0.5 s out to black, so the loop restarts cleanly on the boot screen's black.
4. Encode with `-an -map_metadata -1 -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -bsf:v filter_units=remove_types=6 -fflags +bitexact -movflags +faststart`.
   - Also clear the muxer's tool tag with `-metadata encoder=` if it remains.
   - Encode to a temp file first, then copy it to `public/projects/halcyon-somatics/screen.mp4`.
5. **Poster:** frame 90 of Part 2 → `screen-poster.webp` (1280 wide, quality 82), via sharp.

Update the file's top comment.

- [ ] **Step 3: Run it and check**

Run: `npm run video:halcyon`. It builds, then records. The first time on a machine, run `npx playwright install ffmpeg` (Playwright's recorder needs it).

Then:
- Run `npx vitest run tests/unit/video-metadata.test.js`; expect PASS.
- Watch `screen.mp4`, and report its length and size. Expect about 8–14 s, under 3 MB.
- Confirm it opens on the boot text (no black first second), fades into the 3D body, and ends on black.

- [ ] **Step 4: Update the copy and the docs**

In `projects.js:43`, set `alt` and `caption` to the spec's exact strings.

In the CLAUDE.md row, say: it records the HALCYON page's start-up, then the HALCYON world frame by frame, and joins them; it runs `vite build` first.

Run `npm test`, `npm run check`, and `npx playwright test tests/e2e/video.spec.js tests/e2e/halcyon-world.spec.js`.

- [ ] **Step 5: Commit**

```bash
git add tools/capture-halcyon-video.mjs package.json public/projects/halcyon-somatics/screen.mp4 public/projects/halcyon-somatics/screen-poster.webp src/content/projects.js CLAUDE.md tests/unit/video-metadata.test.js
git commit -m "feat: remake the HALCYON video as the page's start-up followed by the chapter's 3D body" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: A more human ASCII figure

**Files:**
- Modify: `tools/covers/ascii.html:13-20` (replace the `figure(u, v)` silhouette)
- Modify: `public/projects/ascii-mirror/cover.webp`, `cover-900.webp`
- Modify: `src/content/projects.js:71` (the cover's `alt`, exactly as in the spec)

**Interfaces:** `figure(u, v) → 0..1` brightness, in square coordinates `0..1`. Same contract as today; the drawing loop and the character ramp are unchanged.

- [ ] **Step 1: Redraw the figure**

Build the person from rounded shapes: a signed-distance union of capsules, each a segment with a radius. Keypoints in `(u, v)` for a three-quarter view mid-stride:

| Part | Keypoints |
|---|---|
| Head | circle at (0.50, 0.13), r 0.055 |
| Neck | (0.50, 0.18) to (0.50, 0.22), r 0.022 |
| Torso | shoulders (0.43, 0.24)–(0.57, 0.24) and hips (0.46, 0.50)–(0.54, 0.50), filled as a tapered quad, softened by 0.02 |
| Left arm (back swing) | (0.44, 0.25) → elbow (0.41, 0.36) → wrist (0.43, 0.46), r 0.022 then 0.018 |
| Right arm (forward swing) | (0.56, 0.25) → elbow (0.60, 0.35) → wrist (0.62, 0.44), same radii |
| Left leg (back) | hip (0.47, 0.50) → knee (0.44, 0.69) → ankle (0.40, 0.86), r 0.032 then 0.026, plus a foot (0.40, 0.86)–(0.37, 0.88) |
| Right leg (forward) | hip (0.53, 0.50) → knee (0.56, 0.68) → ankle (0.58, 0.86), same radii, plus a foot (0.58, 0.86)–(0.63, 0.87) |

Brightness:
- inside the shape, `clamp(0.35 + depth * 18)`, where `depth` is the distance inside;
- multiplied by the existing left-light term, re-centred so the light falls off across the figure (`0.55 + 0.45 * clamp(1 - (u - 0.40) / 0.25)`);
- the limbs on the far side (the left arm and left leg) multiplied by 0.75, so they read as behind.

The implementer may nudge keypoints by up to 0.03 for a natural pose, and must say what they changed.

- [ ] **Step 2: Render and publish**

Run: `node tools/covers.mjs`, then `node tools/publish-media.mjs`.

Then:
- `git status public/projects` should show only `ascii-mirror/cover.webp` and `cover-900.webp` changed. Restore the Pico cover if its bytes changed but it looks the same.
- Look at the cover at full size, and at 375×812 in the site (`?posters`): it must read as a walking person.

- [ ] **Step 3: Update the alt text and test**

In `projects.js:71`, set `alt` to the spec's exact string.

Run: `npm test`, `npm run check`, `npm run check:media`, and `npx playwright test tests/e2e/ascii-world.spec.js tests/e2e/a11y.spec.js`.

- [ ] **Step 4: Commit**

```bash
git add tools/covers/ascii.html public/projects/ascii-mirror/cover.webp public/projects/ascii-mirror/cover-900.webp src/content/projects.js
git commit -m "feat: redraw the ASCII Mirror figure as a person mid-stride" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Finally (after Task 6)

Run the full suites once:
- `npm test`
- `npm run test:e2e`, in the background
- `npm run check`
- `npm run check:media`

All must pass. The final branch review then follows, and after it Oscar's look at the site.
