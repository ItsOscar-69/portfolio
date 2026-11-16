# Portfolio Milestone 1 (Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, deployable portfolio shell. It has every chapter, the hero ring, the warp transitions, the pill and menu, posters, the live HALCYON copy and tests. All four project chapters use the generic "picture to particles" world.

**Architecture:**
- A Vite plugin validates `src/content/projects.js` and renders it into `index.html` at build time, so all text is real HTML.
- A single fixed WebGL canvas (the "stage") renders one world per scene. Worlds load lazily as you approach them, are disposed two scenes away, and are blended with a zoom-blur shader during transitions.
- A pure `sceneState()` function turns the scroll position (smoothed by Lenis) into `{ active, next, progress, transition }`.
- Posters (pre-rendered stills) stand in whenever 3D is off, slow to load or broken.

**Tech Stack:**
- Vite 6.4.1, three.js 0.181.0, Lenis 1.3.11 and @fontsource fonts.
- Vitest 3.2.4 for unit tests, and Playwright 1.61.1 (driving installed Microsoft Edge) for browser tests and capture tools.
- sharp 0.32.6 for images.

**Spec:** `docs/superpowers/specs/2026-11-16-portfolio-design.md`

**Deliberate differences from the spec, all within milestone scope:**
- **GSAP:** not used in M1. Scroll is a pure function fed by Lenis, so ScrollTrigger would add weight for nothing. Add it later only if a world needs timeline choreography.
- **Bloom:** deferred to M4, where the Pico world first needs it.
- **HALCYON live copy:** served as static files from `public/halcyon/` rather than as a second Vite page, because its scripts are classic, non-module scripts.
- **Hanken Grotesk:** uses weights 200–500. 500 is for small emphasis.
- **HALCYON screen video:** arrives in M2 together with HALCYON's own world. M1 has its three screenshots and the live link.

## Global Constraints

- **Node:** must run on Node 18.16.0 (this PC) and Node 20 (CI).
- **Exact versions:** install with `--save-exact`.
  - vite 6.4.1, vitest 3.2.4, @playwright/test 1.61.1 (the last release that supports Node 18) and sharp 0.32.6 (0.33 needs Node ≥18.17).
  - three 0.181.0 and lenis 1.3.11.
  - @fontsource/* 5.3.0, except @fontsource/noto-sans-jp 5.3.1.
- **Playwright browser:** Playwright uses the installed Microsoft Edge (`channel: 'msedge'`) with SwiftShader WebGL, so no browser download is needed. To use Playwright's own Chromium instead, run `npx playwright install chromium` and set `PW_CHANNEL=chromium`.
- **The repo will be public.** No file or commit message may contain Oscar's surname, school, state, assignment name or any email address. The only name shown is "Oscar".
- **Git identity:** commit with the existing global git identity (`ItsOscar-69` with its GitHub noreply address). Never change git config.
- **No pushing:** do not push to GitHub or create the remote in this milestone. The first publish is gated in milestone 6.
- **No third parties:** the built site makes no requests to third-party hosts. No Google Fonts, CDNs, analytics, cookies or trackers.
- **Look:** dark only, with page background `#090909`.
- **Base path:** every URL written into HTML goes through `withBase()` with `BASE` from `site.config.js` (currently `/`).
- **Never commit:** `raw/`, `sources.local.json` or `privacy.local.json`. These are inputs and secrets.
- **Copy:** first person in Oscar's voice, short and plain. It is honest about who did what: Claude Code wrote the Pico's first comet and the colour-overflow fix, Oscar wrote the other six effects and the show loop, and Claude composed the DEAD TIRED final layout at Oscar's request.
- **Commit messages:** every one ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pass it as a second `-m`.
- **Working directory:** all commands run from `C:\Users\Oscar\Downloads\portfolio` in Git Bash.

## Review Focus

1. **Content containing `<`, `&` or quotes** (for example, a title like `Tom & Jerry <3`) must show as text, not break the markup. Task 5's render test covers this.
2. **Opening a deep link** such as `/#dead-tired` must land on that chapter, with the pill naming it. Task 9's test covers this.
3. **Resizing or rotating the window mid-page** must re-measure the scenes, so the pill still names the right chapter. Task 9's test covers this.
4. **A cover image with nothing bright enough to sample**, or one that fails to load, must fall back to that chapter's poster without breaking the rest of the page. Task 3's unit test and Task 11's browser test cover this.
5. **A new project added without regenerating posters** must make `npm test` fail with "run `npm run posters`" instead of silently shipping an empty poster. Task 13's unit test covers this.

---

## File Structure

```
portfolio/
  package.json  site.config.js  vite.config.js  vitest.config.js  playwright.config.js
  index.html                      page skeleton with <!--@markers--> filled at build time
  CLAUDE.md                       how to work on this repo (public)
  .claude/launch.json             dev server for the desktop app's preview pane
  .github/workflows/deploy.yml    build + test + publish to GitHub Pages (runs once pushed)
  sources.local.json              (gitignored) where the raw source files live on this PC
  privacy.local.json              (gitignored) words that must never appear in tracked files
  plugins/chapters.js             Vite plugin: validate + render projects into index.html
  src/
    main.js                       entry: fonts, styles, startApp()
    app.js                        scenes, scroll, pill/menu, stage lifecycle, still mode
    content/projects.js           THE project list
    content/validate.js           validateProjects()
    content/render.js             pure HTML renderers
    lib/scroll.js lifecycle.js rng.js tier.js sample.js   pure, unit tested
    stage/stage.js                renderer, world loading, frame()
    stage/transition.js           zoom-blur compositor
    worlds/names.js               WORLD_NAMES (used by validation)
    worlds/registry.js            name -> lazy loader (import.meta.glob)
    worlds/index.js picture.js dormant.js   one world per file
    worlds/lib/ring.js            the hero's 3D text ring
    ui/menu.js ui/pill.js         chapter menu + floating pill
    styles/base.css layout.css chapter.css ui.css
  tools/
    lib/browser.mjs lib/static-server.mjs lib/halcyon-transform.mjs
    copy-sources.mjs halcyon.mjs covers.mjs capture-halcyon.mjs
    publish-media.mjs check-media.mjs check-content.mjs posters.mjs
    covers/ascii.html covers/pico.html
  public/
    favicon.svg  halcyon/**  projects/<id>/**  posters/*.webp
  tests/unit/*.test.js  tests/e2e/*.spec.js
```

---

### Task 1: Scaffold the project and toolchain

**Files:**
- Create: `package.json`, `site.config.js`, `vite.config.js`, `vitest.config.js`, `playwright.config.js`, `index.html`, `src/main.js`, `src/styles/base.css`, `public/favicon.svg`, `.claude/launch.json`, `tests/unit/smoke.test.js`, `tests/e2e/smoke.spec.js`
- Modify: `.gitignore` (replace contents)

**Interfaces:**
- Produces: `BASE` (string, ends with `/`) from `site.config.js`; npm scripts `dev`, `build`, `preview` (port 4173), `test`, `test:e2e`; the `index.html` markers `<!--@count-->`, `<!--@hero-links-->`, `<!--@hero-poster-->`, `<!--@chapters-->`, `<!--@next-number-->`, `<!--@next-poster-->`, `<!--@menu-->`; CSS tokens `--ink --ink-2 --paper --muted --faint --font-sans --font-mono --gutter --radius`; font classes `.font-michroma .font-big-shoulders .font-mono`; `.mono`, `.visually-hidden`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "portfolio",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18.16.0" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Install pinned dependencies**

Run:
```bash
npm install --save-exact three@0.181.0 lenis@1.3.11 @fontsource/hanken-grotesk@5.3.0 @fontsource/jetbrains-mono@5.3.0 @fontsource/michroma@5.3.0 @fontsource/big-shoulders-display@5.3.0
npm install --save-dev --save-exact vite@6.4.1 vitest@3.2.4 @playwright/test@1.61.1 sharp@0.32.6 @fontsource/ibm-plex-mono@5.3.0 @fontsource/noto-sans-jp@5.3.1
```
Expected: both finish without `EBADENGINE` errors. Warnings about deprecated sub-packages are fine.

- [ ] **Step 3: Replace `.gitignore`**

```
node_modules/
dist/
raw/
sources.local.json
privacy.local.json
test-results/
playwright-report/
screens/
.superpowers/
*.log
```

- [ ] **Step 4: Create `site.config.js`, `vite.config.js` and `vitest.config.js`**

`site.config.js`:
```js
// The URL path the site is served from: '/' for https://itsoscar-69.github.io/.
// If the repo is ever named something other than ItsOscar-69.github.io, set this to '/<repo>/'.
export const BASE = '/';
```

`vite.config.js`:
```js
import { defineConfig } from 'vite';
import { BASE } from './site.config.js';

export default defineConfig({
  base: BASE,
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 800 },
  server: { port: 5173 },
});
```

`vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.js'], environment: 'node' },
});
```

- [ ] **Step 5: Create `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';
import { BASE } from './site.config.js';

const channel = process.env.PW_CHANNEL || 'msedge';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:4173${BASE}`,
    ...(channel === 'chromium' ? {} : { channel }),
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:4173${BASE}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
```

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Oscar — Built with Claude Code</title>
    <meta name="description" content="Projects I've built with Claude Code: websites, hardware and design." />
    <meta name="theme-color" content="#090909" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <script type="module" src="/src/main.js"></script>
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <canvas class="stage" aria-hidden="true"></canvas>
    <header class="topbar">
      <a class="topbar__mark" href="#top">Oscar</a>
      <button class="topbar__projects" type="button" aria-haspopup="true" aria-controls="chapter-menu" aria-expanded="false" data-menu-placement="top">Projects <span aria-hidden="true">▾</span></button>
      <a class="topbar__cta" href="https://github.com/ItsOscar-69" rel="me noopener">GitHub</a>
    </header>
    <main id="main">
      <section class="scene hero" id="top" data-scene-id="hero" data-world="index" data-world-options="{}">
        <div class="scene__track">
          <div class="scene__frame">
            <!--@hero-poster-->
            <h1 class="visually-hidden">Oscar — Built with Claude Code</h1>
            <p class="hero__count"><!--@count--> built with Claude Code, and counting</p>
            <nav class="hero__links" aria-label="Jump to a project"><!--@hero-links--></nav>
          </div>
        </div>
      </section>
      <!--@chapters-->
      <section class="scene next" id="next" data-scene-id="next" data-world="dormant" data-world-options="{}" data-number="<!--@next-number-->" aria-labelledby="next-title">
        <div class="scene__track">
          <div class="scene__frame">
            <!--@next-poster-->
            <h2 class="next__title" id="next-title">Project <!--@next-number--> is loading…</h2>
            <p class="next__sub">There's always another one in progress.</p>
            <p class="next__about">I'm Oscar. I make things with Claude Code: websites, hardware, design.</p>
          </div>
        </div>
      </section>
    </main>
    <footer class="footer">
      <span>Oscar · Built with Claude Code</span>
      <span><a href="https://github.com/ItsOscar-69" rel="me noopener">GitHub</a> · <a href="#top">Back to top ↑</a></span>
    </footer>
    <div class="pill" hidden>
      <button class="pill__button" type="button" aria-haspopup="true" aria-controls="chapter-menu" aria-expanded="false" data-menu-placement="bottom"><span class="pill__label"></span><span aria-hidden="true">☰</span></button>
    </div>
    <nav class="menu" id="chapter-menu" aria-label="Chapters" hidden>
      <ul class="menu__list"><!--@menu--></ul>
    </nav>
  </body>
</html>
```

- [ ] **Step 7: Create `src/main.js`, `src/styles/base.css` and `public/favicon.svg`**

`src/main.js`:
```js
import '@fontsource/hanken-grotesk/200.css';
import '@fontsource/hanken-grotesk/300.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/michroma/400.css';
import '@fontsource/big-shoulders-display/900.css';
import './styles/base.css';
```

`src/styles/base.css`:
```css
:root {
  --ink: #090909;
  --ink-2: #111111;
  --paper: #f4f4f2;
  --muted: rgba(244, 244, 242, 0.68);
  --faint: rgba(244, 244, 242, 0.16);
  --font-sans: 'Hanken Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, Consolas, monospace;
  --gutter: clamp(16px, 4vw, 48px);
  --radius: 14px;
  color-scheme: dark;
}
*, *::before, *::after { box-sizing: border-box; }
html { background: var(--ink); color: var(--paper); -webkit-text-size-adjust: 100%; }
html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
.lenis.lenis-stopped { overflow: hidden; }
body { margin: 0; background: var(--ink); color: var(--paper); font-family: var(--font-sans); font-weight: 300; font-size: 17px; line-height: 1.55; }
img, video, canvas { display: block; max-width: 100%; }
a { color: inherit; }
button { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--paper); outline-offset: 3px; }
.mono { font-family: var(--font-mono); font-weight: 400; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.visually-hidden { position: absolute !important; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.skip { position: fixed; left: 12px; top: 12px; z-index: 50; padding: 8px 14px; border-radius: 999px; background: var(--paper); color: var(--ink); transform: translateY(-200%); }
.skip:focus { transform: none; }
.font-michroma { font-family: 'Michroma', var(--font-sans); font-weight: 400; letter-spacing: 0.01em; }
.font-big-shoulders { font-family: 'Big Shoulders Display', var(--font-sans); font-weight: 900; text-transform: uppercase; letter-spacing: 0.01em; }
.font-mono { font-family: var(--font-mono); font-weight: 400; letter-spacing: -0.03em; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#090909"/><circle cx="32" cy="32" r="17" fill="none" stroke="#f4f4f2" stroke-width="5"/></svg>
```

- [ ] **Step 8: Create `.claude/launch.json`**

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "portfolio-dev", "runtimeExecutable": "node", "runtimeArgs": ["node_modules/vite/bin/vite.js", "--port", "5173", "--strictPort"], "port": 5173 }
  ]
}
```

- [ ] **Step 9: Write the smoke tests**

`tests/unit/smoke.test.js`:
```js
import { it, expect } from 'vitest';
import { BASE } from '../../site.config.js';

it('serves from a base path that starts and ends with a slash', () => {
  expect(BASE.startsWith('/')).toBe(true);
  expect(BASE.endsWith('/')).toBe(true);
});
```

`tests/e2e/smoke.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('the page loads with its title', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Oscar — Built with Claude Code');
});
```

- [ ] **Step 10: Run both test suites**

Run: `npm test`
Expected: 1 passed.

Run: `npm run test:e2e`
Expected: 1 passed. If Playwright reports that Edge can't be found, run `npx playwright install chromium`, then run `PW_CHANNEL=chromium npm run test:e2e`.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json .gitignore site.config.js vite.config.js vitest.config.js playwright.config.js index.html src public .claude tests
git commit -m "feat: scaffold Vite project, page skeleton and test runners" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Scroll and world-lifecycle maths

**Files:**
- Create: `src/lib/scroll.js`, `src/lib/lifecycle.js`
- Test: `tests/unit/scroll.test.js`, `tests/unit/lifecycle.test.js`

**Interfaces:**
- Produces:
  - `clamp01(v: number): number`
  - `sceneState(y: number, vh: number, scenes: {start: number, length: number}[]): { active: number, next: number, progress: number, transition: number, display: number }`. `next` and `active` are -1 when absent. `display` is the scene the UI should name (`next` once `transition > 0.5`).
  - `lifecyclePlan(active: number, loaded: Set<number>, sceneCount: number): { load: number[], dispose: number[] }`

- [ ] **Step 1: Write the failing tests**

`tests/unit/scroll.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { clamp01, sceneState } from '../../src/lib/scroll.js';

const scenes = [{ start: 0, length: 1000 }, { start: 2000, length: 1000 }, { start: 5000, length: 500 }];
const vh = 1000;

describe('sceneState', () => {
  it('starts in the first scene with nothing in transition', () => {
    expect(sceneState(0, vh, scenes)).toEqual({ active: 0, next: 1, progress: 0, transition: 0, display: 0 });
  });
  it('measures progress through the active scene and clamps at 1', () => {
    expect(sceneState(500, vh, scenes).progress).toBeCloseTo(0.5);
    expect(sceneState(1500, vh, scenes).progress).toBe(1);
  });
  it('starts the transition as the next scene rises from the bottom', () => {
    const s = sceneState(1500, vh, scenes);
    expect(s.transition).toBeCloseTo(0.5);
    expect(s.display).toBe(0);
    expect(sceneState(1600, vh, scenes).display).toBe(1);
  });
  it('hands over exactly at the next scene start', () => {
    expect(sceneState(2000, vh, scenes)).toMatchObject({ active: 1, next: 2, progress: 0, transition: 0, display: 1 });
  });
  it('has no next scene at the end', () => {
    const s = sceneState(5200, vh, scenes);
    expect(s).toMatchObject({ active: 2, next: -1, transition: 0, display: 2 });
    expect(s.progress).toBeCloseTo(0.4);
  });
  it('treats overscroll above the top as the first scene', () => {
    expect(sceneState(-80, vh, scenes)).toMatchObject({ active: 0, progress: 0 });
  });
  it('copes with an empty layout', () => {
    expect(sceneState(100, vh, [])).toEqual({ active: -1, next: -1, progress: 0, transition: 0, display: -1 });
  });
});

describe('clamp01', () => {
  it('clamps to the 0..1 range', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(9)).toBe(1);
  });
});
```

`tests/unit/lifecycle.test.js`:
```js
import { it, expect } from 'vitest';
import { lifecyclePlan } from '../../src/lib/lifecycle.js';

it('loads the active scene and the one after it', () => {
  expect(lifecyclePlan(0, new Set(), 6)).toEqual({ load: [0, 1], dispose: [] });
});
it('keeps the scene behind and disposes scenes two or more away', () => {
  expect(lifecyclePlan(3, new Set([0, 1, 2, 3]), 6)).toEqual({ load: [4], dispose: [0, 1] });
});
it('never loads past the last scene', () => {
  expect(lifecyclePlan(5, new Set([4, 5]), 6)).toEqual({ load: [], dispose: [] });
});
it('does nothing for an empty layout', () => {
  expect(lifecyclePlan(-1, new Set(), 0)).toEqual({ load: [], dispose: [] });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/unit/scroll.test.js tests/unit/lifecycle.test.js`
Expected: FAIL, because `src/lib/scroll.js` and `src/lib/lifecycle.js` don't exist yet.

- [ ] **Step 3: Implement**

`src/lib/scroll.js`:
```js
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// scenes: [{ start, length }] sorted by start (document px). length = scroll distance of the scene's intro.
export function sceneState(y, vh, scenes) {
  if (!scenes.length) return { active: -1, next: -1, progress: 0, transition: 0, display: -1 };
  let active = 0;
  for (let i = 0; i < scenes.length; i++) if (scenes[i].start <= y) active = i;
  const next = active + 1 < scenes.length ? active + 1 : -1;
  const progress = clamp01((y - scenes[active].start) / Math.max(1, scenes[active].length));
  const transition = next === -1 ? 0 : clamp01((y + vh - scenes[next].start) / vh);
  const display = transition > 0.5 ? next : active;
  return { active, next, progress, transition, display };
}
```

`src/lib/lifecycle.js`:
```js
// Which worlds to create and which to free, given the active scene.
// Loads the active scene and the next one; keeps the one behind; frees anything 2+ away.
export function lifecyclePlan(active, loaded, sceneCount) {
  const inRange = (i) => i >= 0 && i < sceneCount;
  const load = [active, active + 1].filter((i) => inRange(i) && !loaded.has(i));
  const dispose = [...loaded].filter((i) => Math.abs(i - active) >= 2).sort((a, b) => a - b);
  return { load, dispose };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run tests/unit/scroll.test.js tests/unit/lifecycle.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit/scroll.test.js tests/unit/lifecycle.test.js
git commit -m "feat: add scroll-to-scene and world lifecycle maths" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Seeded randomness, device tiers and image sampling

**Files:**
- Create: `src/lib/rng.js`, `src/lib/tier.js`, `src/lib/sample.js`
- Test: `tests/unit/rng.test.js`, `tests/unit/tier.test.js`, `tests/unit/sample.test.js`

**Interfaces:**
- Produces:
  - `mulberry32(seed: number): () => number`, returning values in [0, 1).
  - `pickTier({ gpu: string, cores: number, width: number }): 'high' | 'mid' | 'low'`.
  - `TIER_SETTINGS: { high | mid | low: { dprCap: number, particleScale: number } }`.
  - `particleCount(base: number, tier: string): number`, with a floor of 500.
  - `luminance(r, g, b): number`, in 0..1.
  - `samplePoints(image: { width, height, data: Uint8ClampedArray }, count: number, rng, { minAlpha = 128, minLuma = 0.08, depth = 0.35 }?)`, returning `{ positions: Float32Array, colors: Float32Array, count: number, extent: { x, y } }`. Positions fit in `[-extent.x, extent.x] × [-extent.y, extent.y]`, and the longer side spans -1..1. `count` is 0 when nothing is visible.

- [ ] **Step 1: Write the failing tests**

`tests/unit/rng.test.js`:
```js
import { it, expect } from 'vitest';
import { mulberry32 } from '../../src/lib/rng.js';

it('repeats the same sequence for the same seed', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 20; i++) expect(a()).toBe(b());
});
it('gives different sequences for different seeds', () => {
  expect(mulberry32(1)()).not.toBe(mulberry32(2)());
});
it('stays inside [0, 1) and averages near 0.5', () => {
  const r = mulberry32(7);
  let sum = 0;
  for (let i = 0; i < 2000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); sum += v; }
  expect(sum / 2000).toBeGreaterThan(0.45);
  expect(sum / 2000).toBeLessThan(0.55);
});
```

`tests/unit/tier.test.js`:
```js
import { it, expect } from 'vitest';
import { pickTier, particleCount, TIER_SETTINGS } from '../../src/lib/tier.js';

it('treats software renderers as low', () => {
  expect(pickTier({ gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', cores: 16, width: 1920 })).toBe('low');
});
it('treats two-core machines as low', () => {
  expect(pickTier({ gpu: 'Apple GPU', cores: 2, width: 1440 })).toBe('low');
});
it('treats phone-sized screens as mid', () => {
  expect(pickTier({ gpu: 'Apple GPU', cores: 6, width: 390 })).toBe('mid');
});
it('treats quad-core laptops as mid', () => {
  expect(pickTier({ gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', cores: 4, width: 1366 })).toBe('mid');
});
it('gives a capable desktop high', () => {
  expect(pickTier({ gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', cores: 12, width: 1920 })).toBe('high');
});
it('scales particle counts by tier with a floor', () => {
  expect(particleCount(40000, 'high')).toBe(40000);
  expect(particleCount(40000, 'mid')).toBe(20000);
  expect(particleCount(40000, 'low')).toBe(8000);
  expect(particleCount(1000, 'low')).toBe(500);
});
it('caps pixel ratio per tier', () => {
  expect(TIER_SETTINGS.high.dprCap).toBe(2);
  expect(TIER_SETTINGS.mid.dprCap).toBe(1.5);
  expect(TIER_SETTINGS.low.dprCap).toBe(1);
});
```

`tests/unit/sample.test.js`:
```js
import { it, expect } from 'vitest';
import { samplePoints, luminance } from '../../src/lib/sample.js';
import { mulberry32 } from '../../src/lib/rng.js';

const image = (w, h, rgba) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(rgba, i * 4);
  return { width: w, height: h, data };
};

it('returns the requested number of points inside the image bounds', () => {
  const r = samplePoints(image(4, 2, [255, 255, 255, 255]), 500, mulberry32(1));
  expect(r.count).toBe(500);
  expect(r.positions.length).toBe(1500);
  expect(r.extent).toEqual({ x: 1, y: 0.5 });
  for (let i = 0; i < 500; i++) {
    expect(Math.abs(r.positions[i * 3])).toBeLessThanOrEqual(1);
    expect(Math.abs(r.positions[i * 3 + 1])).toBeLessThanOrEqual(0.5);
  }
});
it('only samples visible pixels and keeps their colour', () => {
  const img = image(4, 2, [0, 0, 0, 255]);
  img.data.set([255, 0, 0, 255], 0); // top-left pixel is red, the rest black
  const r = samplePoints(img, 200, mulberry32(2));
  for (let i = 0; i < 200; i++) {
    expect(r.positions[i * 3]).toBeLessThan(-0.5);
    expect(r.positions[i * 3 + 1]).toBeGreaterThan(0);
    expect(r.colors[i * 3]).toBe(1);
    expect(r.colors[i * 3 + 1]).toBe(0);
  }
});
it('returns zero points when nothing is visible (all dark or all transparent)', () => {
  expect(samplePoints(image(3, 3, [0, 0, 0, 255]), 100, mulberry32(3)).count).toBe(0);
  expect(samplePoints(image(3, 3, [255, 255, 255, 0]), 100, mulberry32(3)).count).toBe(0);
});
it('is deterministic for the same seed', () => {
  const a = samplePoints(image(8, 8, [200, 120, 40, 255]), 50, mulberry32(9));
  const b = samplePoints(image(8, 8, [200, 120, 40, 255]), 50, mulberry32(9));
  expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
});
it('fits portrait images to the full height', () => {
  expect(samplePoints(image(2, 4, [255, 255, 255, 255]), 10, mulberry32(4)).extent).toEqual({ x: 0.5, y: 1 });
});
it('computes perceived brightness', () => {
  expect(luminance(255, 255, 255)).toBeCloseTo(1);
  expect(luminance(0, 0, 0)).toBe(0);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/unit/rng.test.js tests/unit/tier.test.js tests/unit/sample.test.js`
Expected: FAIL, because the modules don't exist yet.

- [ ] **Step 3: Implement**

`src/lib/rng.js`:
```js
// Small, fast seeded PRNG so worlds and tests are repeatable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`src/lib/tier.js`:
```js
const LOW_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mali-[4t]\d\d\b|adreno \(tm\) [2-4]\d\d\b|powervr sgx/i;

export const TIER_SETTINGS = {
  high: { dprCap: 2, particleScale: 1 },
  mid: { dprCap: 1.5, particleScale: 0.5 },
  low: { dprCap: 1, particleScale: 0.2 },
};

export function pickTier({ gpu = '', cores = 4, width = 1280 } = {}) {
  if (LOW_GPU.test(gpu) || cores <= 2) return 'low';
  if (width < 900 || cores <= 4) return 'mid';
  return 'high';
}

export function particleCount(base, tier) {
  const scale = (TIER_SETTINGS[tier] || TIER_SETTINGS.mid).particleScale;
  return Math.max(500, Math.round(base * scale));
}
```

`src/lib/sample.js`:
```js
export function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Turns an image into `count` particles. Longer image side spans -1..1; z comes from brightness.
export function samplePoints(image, count, rng, { minAlpha = 128, minLuma = 0.08, depth = 0.35 } = {}) {
  const { data, width, height } = image;
  const aspect = width / height;
  const extent = aspect >= 1 ? { x: 1, y: 1 / aspect } : { x: aspect, y: 1 };
  const candidates = [];
  for (let o = 0; o < data.length; o += 4) {
    if (data[o + 3] >= minAlpha && luminance(data[o], data[o + 1], data[o + 2]) >= minLuma) candidates.push(o);
  }
  if (!candidates.length) return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0, extent };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const o = candidates[Math.floor(rng() * candidates.length)];
    const px = (o / 4) % width;
    const py = Math.floor(o / 4 / width);
    const u = (px + rng()) / width;
    const v = (py + rng()) / height;
    positions[i * 3] = (u * 2 - 1) * extent.x;
    positions[i * 3 + 1] = (1 - v * 2) * extent.y;
    positions[i * 3 + 2] = (luminance(data[o], data[o + 1], data[o + 2]) - 0.5) * depth;
    colors[i * 3] = data[o] / 255;
    colors[i * 3 + 1] = data[o + 1] / 255;
    colors[i * 3 + 2] = data[o + 2] / 255;
  }
  return { positions, colors, count, extent };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run tests/unit/rng.test.js tests/unit/tier.test.js tests/unit/sample.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit/rng.test.js tests/unit/tier.test.js tests/unit/sample.test.js
git commit -m "feat: add seeded rng, device tiers and image-to-particle sampling" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Content validation (the build check)

**Files:**
- Create: `src/worlds/names.js`, `src/content/validate.js`
- Test: `tests/unit/validate.test.js`

**Interfaces:**
- Produces:
  - `WORLD_NAMES: string[]`, which is `['index', 'picture', 'dormant']`.
  - `MEDIA_TYPES`.
  - `FONT_KEYS`, which is `['michroma', 'big-shoulders', 'mono']`.
  - `validateProjects(projects, { worldNames: string[], fileExists: (pathRelativeToPublic: string) => boolean }): string[]`. It returns human-readable errors (empty when valid). File paths it checks look like `projects/<id>/<file>`.

- [ ] **Step 1: Write the failing test**

`tests/unit/validate.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { validateProjects } from '../../src/content/validate.js';

const files = new Set(['projects/demo/cover.webp', 'projects/demo/shot.webp', 'projects/demo/a.py', 'projects/demo/poster.webp', 'projects/demo/clip.mp4']);
const ctx = { worldNames: ['index', 'picture', 'dormant'], fileExists: (p) => files.has(p) };
const valid = (over = {}) => ({
  id: 'demo', title: 'Demo', hook: 'A demo.', date: '2026-09', status: 'done', tags: ['Web'],
  world: 'picture', worldOptions: { cover: 'cover.webp', palette: ['#39ff88'] },
  headline: 'Hi.', summary: 'Text.', cards: { idea: 'a', built: 'b', inside: 'c' },
  media: [{ type: 'image', src: 'shot.webp', alt: 'A shot' }],
  ...over,
});
const errorsFor = (over) => validateProjects([valid(over)], ctx);

describe('validateProjects', () => {
  it('accepts a complete project', () => {
    expect(validateProjects([valid()], ctx)).toEqual([]);
  });
  it('accepts every media type when its files exist', () => {
    expect(errorsFor({ media: [
      { type: 'image', src: 'shot.webp', alt: 'x' },
      { type: 'video', src: 'clip.mp4', poster: 'poster.webp', alt: 'x' },
      { type: 'model', src: 'shot.webp', poster: 'poster.webp', alt: 'x' },
      { type: 'code', src: 'a.py', lines: [2, 9] },
      { type: 'link', src: '/halcyon/', caption: 'Open it' },
    ] })).toEqual([]);
  });
  it('rejects an empty or missing list', () => {
    expect(validateProjects([], ctx)).toHaveLength(1);
    expect(validateProjects(undefined, ctx)).toHaveLength(1);
  });
  it('names the missing text field', () => {
    expect(errorsFor({ title: '' })[0]).toMatch(/"title" is required/);
  });
  it('rejects ids that are not kebab-case and ids used twice', () => {
    expect(errorsFor({ id: 'My Project' })[0]).toMatch(/kebab-case/);
    expect(validateProjects([valid(), valid()], ctx).join('\n')).toMatch(/already used/);
  });
  it('checks date, status, tags, font and palette formats', () => {
    expect(errorsFor({ date: 'Sept 2026' })[0]).toMatch(/YYYY-MM/);
    expect(errorsFor({ status: 'finished' })[0]).toMatch(/"done" or "in-progress"/);
    expect(errorsFor({ tags: [] })[0]).toMatch(/1 to 5/);
    expect(errorsFor({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] })[0]).toMatch(/1 to 5/);
    expect(errorsFor({ font: 'comic-sans' })[0]).toMatch(/"font" must be one of/);
    expect(errorsFor({ worldOptions: { cover: 'cover.webp', palette: ['green'] } })[0]).toMatch(/palette/);
  });
  it('rejects unregistered worlds', () => {
    expect(errorsFor({ world: 'lava' })[0]).toMatch(/world "lava" is not registered/);
  });
  it('requires a cover file for the picture world', () => {
    expect(errorsFor({ worldOptions: {} })[0]).toMatch(/needs "worldOptions.cover"/);
    expect(errorsFor({ worldOptions: { cover: 'nope.webp' } })[0]).toMatch(/cover file not found: public\/projects\/demo\/nope.webp/);
  });
  it('requires cards text', () => {
    expect(errorsFor({ cards: { idea: 'a', built: 'b' } })[0]).toMatch(/"cards" needs/);
  });
  it('checks media items', () => {
    expect(errorsFor({ media: [] })[0]).toMatch(/at least one item/);
    expect(errorsFor({ media: [{ type: 'gif', src: 'x.gif' }] })[0]).toMatch(/"type" must be one of/);
    expect(errorsFor({ media: [{ type: 'image', src: 'missing.webp', alt: 'x' }] })[0]).toMatch(/file not found: public\/projects\/demo\/missing.webp/);
    expect(errorsFor({ media: [{ type: 'image', src: 'shot.webp' }] })[0]).toMatch(/"alt" text is required/);
    expect(errorsFor({ media: [{ type: 'video', src: 'clip.mp4', alt: 'x' }] })[0]).toMatch(/"poster" is required/);
    expect(errorsFor({ media: [{ type: 'link', src: '/x/' }] })[0]).toMatch(/needs a "caption"/);
    expect(errorsFor({ media: [{ type: 'code', src: 'a.py', lines: [9, 2] }] })[0]).toMatch(/"lines" must be/);
  });
  it('checks links', () => {
    expect(errorsFor({ links: [{ label: 'x' }] })[0]).toMatch(/"links" must be a list/);
  });
  it('says which project each error belongs to', () => {
    expect(errorsFor({ title: '' })[0]).toMatch(/^project 1 \(demo\): /);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/validate.test.js`
Expected: FAIL, because `src/content/validate.js` doesn't exist yet.

- [ ] **Step 3: Implement**

`src/worlds/names.js`:
```js
// Every world a project (or the hero / next slot) may use. Each name has a file in src/worlds/<name>.js.
export const WORLD_NAMES = ['index', 'picture', 'dormant'];
```

`src/content/validate.js`:
```js
export const MEDIA_TYPES = ['image', 'video', 'model', 'code', 'link'];
export const FONT_KEYS = ['michroma', 'big-shoulders', 'mono'];
const REQUIRED_TEXT = ['id', 'title', 'hook', 'date', 'status', 'world', 'headline', 'summary'];
const HEX = /^#[0-9a-f]{6}$/i;
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

export function validateProjects(projects, { worldNames, fileExists }) {
  if (!Array.isArray(projects) || projects.length === 0) return ['the project list must contain at least one project'];
  const errors = [];
  const seen = new Set();

  projects.forEach((p, i) => {
    const where = `project ${i + 1}${p && isText(p.id) ? ` (${p.id})` : ''}`;
    const fail = (msg) => errors.push(`${where}: ${msg}`);
    if (!p || typeof p !== 'object') { fail('must be an object'); return; }

    REQUIRED_TEXT.forEach((key) => { if (!isText(p[key])) fail(`"${key}" is required and must be text`); });
    if (isText(p.id)) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)) fail('"id" must be kebab-case, like "my-project"');
      if (seen.has(p.id)) fail('"id" is already used by another project');
      seen.add(p.id);
    }
    if (p.shortTitle !== undefined && !isText(p.shortTitle)) fail('"shortTitle" must be text when given');
    if (isText(p.date) && !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.date)) fail('"date" must look like YYYY-MM');
    if (isText(p.status) && !['done', 'in-progress'].includes(p.status)) fail('"status" must be "done" or "in-progress"');
    if (!Array.isArray(p.tags) || p.tags.length < 1 || p.tags.length > 5 || !p.tags.every(isText)) fail('"tags" must be a list of 1 to 5 labels');
    if (isText(p.world) && !worldNames.includes(p.world)) fail(`world "${p.world}" is not registered (known worlds: ${worldNames.join(', ')})`);
    if (p.font !== undefined && !FONT_KEYS.includes(p.font)) fail(`"font" must be one of: ${FONT_KEYS.join(', ')}`);

    const c = p.cards;
    if (!c || !isText(c.idea) || !isText(c.built) || !isText(c.inside)) fail('"cards" needs "idea", "built" and "inside" text');

    const o = p.worldOptions;
    if (o !== undefined && (typeof o !== 'object' || o === null || Array.isArray(o))) fail('"worldOptions" must be an object');
    if (o && o.palette !== undefined && (!Array.isArray(o.palette) || !o.palette.every((h) => typeof h === 'string' && HEX.test(h)))) {
      fail('"worldOptions.palette" must be a list of colours like "#39ff88"');
    }
    if (p.world === 'picture') {
      if (!o || !isText(o.cover)) fail('the "picture" world needs "worldOptions.cover"');
      else if (!fileExists(`projects/${p.id}/${o.cover}`)) fail(`cover file not found: public/projects/${p.id}/${o.cover}`);
    }

    if (!Array.isArray(p.media) || p.media.length === 0) fail('"media" needs at least one item');
    else p.media.forEach((m, j) => {
      const at = `media ${j + 1}`;
      if (!m || !MEDIA_TYPES.includes(m.type)) { fail(`${at}: "type" must be one of ${MEDIA_TYPES.join(', ')}`); return; }
      if (!isText(m.src)) { fail(`${at}: "src" is required`); return; }
      if (m.type === 'link') { if (!isText(m.caption)) fail(`${at}: a link needs a "caption" to use as its label`); return; }
      if (!fileExists(`projects/${p.id}/${m.src}`)) fail(`${at}: file not found: public/projects/${p.id}/${m.src}`);
      if (['image', 'video', 'model'].includes(m.type) && !isText(m.alt)) fail(`${at}: "alt" text is required for ${m.type} media`);
      if (['video', 'model'].includes(m.type)) {
        if (!isText(m.poster)) fail(`${at}: "poster" is required for ${m.type} media`);
        else if (!fileExists(`projects/${p.id}/${m.poster}`)) fail(`${at}: poster not found: public/projects/${p.id}/${m.poster}`);
      }
      if (m.type === 'code' && m.lines !== undefined) {
        const ok = Array.isArray(m.lines) && m.lines.length === 2 && m.lines.every(Number.isInteger) && m.lines[0] >= 1 && m.lines[0] <= m.lines[1];
        if (!ok) fail(`${at}: "lines" must be [first, last] line numbers`);
      }
    });

    if (p.links !== undefined && (!Array.isArray(p.links) || !p.links.every((l) => l && isText(l.label) && isText(l.href)))) {
      fail('"links" must be a list of { label, href }');
    }
  });
  return errors;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run tests/unit/validate.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/worlds/names.js src/content/validate.js tests/unit/validate.test.js
git commit -m "feat: validate the project list with readable errors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: HTML renderers

**Files:**
- Create: `src/content/render.js`
- Test: `tests/unit/render.test.js`

**Interfaces:**
- Consumes: the project shape from Task 4. Image media may carry `hasSmall: boolean`, `width: number` and `height: number`, and code media may carry `code: string`. The plugin in Task 8 attaches all of these.
- Produces:
  - `escapeHtml(s)`.
  - `withBase(base, href)`: `/x` becomes `base + x`, while `#`, absolute and protocol URLs are unchanged.
  - `pad2(n)`, `formatDate('YYYY-MM') → 'Sep 2026'`.
  - `assetUrl(base, id, file)`.
  - `posterImg(id, base, lazy)`.
  - `renderMedia(m, project, base)`.
  - `renderChapter(project, index, base)`. It renders `section.scene.chapter#<id>` with `data-scene-id`, `data-world`, `data-world-options` (JSON, with the cover resolved to a full URL), `data-number`, `data-title` and `data-short`. The inside is `.scene__track > .scene__frame` (poster, meta, optional badge, `h2.chapter__title#<id>-title`, `.chapter__hook`) followed by `.chapter__panel`.
  - `renderMenuItems(projects)`, giving `a.menu__link[data-target]` items plus one `li.menu__soon`.
  - `renderHeroLinks(projects)`.
  - `renderCount(n)`.
  - `renderPage(html, projects, { base })`. It replaces every `<!--@...-->` marker from Task 1 and throws if one is missing.

- [ ] **Step 1: Write the failing test**

`tests/unit/render.test.js`:
```js
import { describe, it, expect } from 'vitest';
import {
  escapeHtml, withBase, formatDate, renderChapter, renderMedia, renderMenuItems,
  renderHeroLinks, renderCount, renderPage,
} from '../../src/content/render.js';

const project = (over = {}) => ({
  id: 'demo', title: 'Demo <b>&"', hook: 'Hook', date: '2026-09', status: 'done', tags: ['Web', 'Fun'],
  world: 'picture', worldOptions: { cover: 'cover.webp' }, headline: 'Headline', summary: 'First.\n\nSecond.',
  cards: { idea: 'I', built: 'B', inside: 'N' }, media: [{ type: 'image', src: 'shot.webp', alt: 'Alt', hasSmall: true }],
  ...over,
});

describe('helpers', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });
  it('prefixes root-relative links with the base and leaves others alone', () => {
    expect(withBase('/', '/halcyon/')).toBe('/halcyon/');
    expect(withBase('/sub/', '/halcyon/')).toBe('/sub/halcyon/');
    expect(withBase('/sub/', 'https://github.com/x')).toBe('https://github.com/x');
    expect(withBase('/sub/', '#top')).toBe('#top');
    expect(withBase('/sub/', 'mailto:x')).toBe('mailto:x');
  });
  it('formats dates as short month and year', () => {
    expect(formatDate('2026-09')).toBe('Sep 2026');
    expect(formatDate('2026-12')).toBe('Dec 2026');
  });
  it('counts projects in words', () => {
    expect(renderCount(1)).toBe('1 project');
    expect(renderCount(4)).toBe('4 projects');
  });
});

describe('renderChapter', () => {
  it('renders the scene attributes, meta line and escaped title', () => {
    const html = renderChapter(project(), 0, '/');
    expect(html).toContain('id="demo"');
    expect(html).toContain('data-scene-id="demo"');
    expect(html).toContain('data-world="picture"');
    expect(html).toContain('data-number="01"');
    expect(html).toContain('01 · Sep 2026 · Web · Fun');
    expect(html).toContain('Demo &lt;b&gt;&amp;&quot;');
    expect(html).not.toContain('<b>&');
    expect(html).toContain('data-world-options="{&quot;cover&quot;:&quot;/projects/demo/cover.webp&quot;}"');
    expect(html).toContain('<p>First.</p><p>Second.</p>');
  });
  it('shows a badge only for projects in progress', () => {
    expect(renderChapter(project(), 0, '/')).not.toContain('class="badge"');
    expect(renderChapter(project({ status: 'in-progress' }), 0, '/')).toContain('<p class="badge">In progress</p>');
  });
  it('adds the display font class', () => {
    expect(renderChapter(project({ font: 'michroma' }), 0, '/')).toContain('class="chapter__title font-michroma"');
  });
  it('uses the base for covers, posters and links', () => {
    const html = renderChapter(project({ links: [{ label: 'Live', href: '/halcyon/' }] }), 2, '/sub/');
    expect(html).toContain('/sub/projects/demo/cover.webp');
    expect(html).toContain('src="/sub/posters/demo.webp"');
    expect(html).toContain('href="/sub/halcyon/"');
    expect(html).toContain('data-number="03"');
  });
  it('uses the short title for data-short when given', () => {
    expect(renderChapter(project({ shortTitle: 'Short' }), 0, '/')).toContain('data-short="Short"');
  });
});

describe('renderMedia', () => {
  const p = project();
  it('adds a 900px srcset only when the small file exists', () => {
    expect(renderMedia({ type: 'image', src: 'shot.webp', alt: 'A', hasSmall: true }, p, '/')).toContain('/projects/demo/shot-900.webp 900w');
    expect(renderMedia({ type: 'image', src: 'shot.webp', alt: 'A' }, p, '/')).not.toContain('srcset');
  });
  it('reserves the image size so lazy images never shift the page', () => {
    expect(renderMedia({ type: 'image', src: 'shot.webp', alt: 'A', width: 1800, height: 1125 }, p, '/')).toContain('width="1800" height="1125"');
  });
  it('escapes code', () => {
    expect(renderMedia({ type: 'code', src: 'a.py', code: 'if a < b:\n  print("x")' }, p, '/')).toContain('if a &lt; b:');
  });
  it('renders links through the base', () => {
    expect(renderMedia({ type: 'link', src: '/halcyon/', caption: 'Open' }, p, '/sub/')).toContain('href="/sub/halcyon/"');
  });
  it('renders video and model with their posters', () => {
    expect(renderMedia({ type: 'video', src: 'c.mp4', poster: 'c.webp', alt: 'A' }, p, '/')).toContain('poster="/projects/demo/c.webp"');
    expect(renderMedia({ type: 'model', src: 'm.glb', poster: 'm.webp', alt: 'A' }, p, '/')).toContain('data-model="/projects/demo/m.glb"');
  });
  it('throws on unknown media types', () => {
    expect(() => renderMedia({ type: 'gif', src: 'x' }, p, '/')).toThrow(/unknown media type/);
  });
});

describe('menu, hero links and page', () => {
  const list = [project({ id: 'a', title: 'Alpha', shortTitle: 'A' }), project({ id: 'b', title: 'Beta' })];
  it('lists every chapter plus a coming-soon slot', () => {
    const html = renderMenuItems(list);
    expect(html).toContain('data-target="a"');
    expect(html).toContain('<span class="mono">01</span>');
    expect(html).toContain('<span class="mono">03</span><span>Coming soon</span>');
  });
  it('uses short titles in hero links', () => {
    expect(renderHeroLinks(list)).toBe('<a href="#a">A</a><a href="#b">Beta</a>');
  });
  it('fills every marker in the page', () => {
    const page = '<!--@count--> <!--@hero-links--> <!--@hero-poster--> <!--@chapters--> <i data-n="<!--@next-number-->"><!--@next-number--></i> <!--@next-poster--> <!--@menu-->';
    const out = renderPage(page, list, { base: '/' });
    expect(out).not.toContain('<!--@');
    expect(out).toContain('2 projects');
    expect(out).toContain('<i data-n="03">03</i>');
    expect(out).toContain('src="/posters/hero.webp"');
  });
  it('throws if a marker is missing', () => {
    expect(() => renderPage('<!--@count-->', list, { base: '/' })).toThrow(/missing the <!--@hero-links--> marker/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/render.test.js`
Expected: FAIL, because `src/content/render.js` doesn't exist yet.

- [ ] **Step 3: Implement `src/content/render.js`**

```js
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
export const pad2 = (n) => String(n).padStart(2, '0');

export function withBase(base, href) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('//')) return href;
  if (href.startsWith('/')) return base.replace(/\/+$/, '') + href;
  return href;
}

export function formatDate(ym) {
  const [year, month] = ym.split('-').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export const assetUrl = (base, id, file) => withBase(base, `/projects/${id}/${file}`);

export function posterImg(id, base, lazy) {
  return `<img class="scene__poster" src="${withBase(base, `/posters/${id}.webp`)}" alt="" aria-hidden="true" decoding="async"${lazy ? ' loading="lazy"' : ''}>`;
}

const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('');
const figcaption = (m) => (m.caption ? `<figcaption>${escapeHtml(m.caption)}</figcaption>` : '');

export function renderMedia(m, project, base) {
  const url = (file) => assetUrl(base, project.id, file);
  switch (m.type) {
    case 'image': {
      const srcset = m.hasSmall
        ? ` srcset="${url(m.src.replace(/\.webp$/i, '-900.webp'))} 900w, ${url(m.src)} 1800w" sizes="(min-width: 900px) 50vw, 100vw"`
        : '';
      const size = m.width && m.height ? ` width="${m.width}" height="${m.height}"` : ''; // reserves space for lazy images
      return `<figure class="media media--image"><img src="${url(m.src)}"${srcset}${size} alt="${escapeHtml(m.alt)}" loading="lazy" decoding="async">${figcaption(m)}</figure>`;
    }
    case 'video':
      return `<figure class="media media--video"><video src="${url(m.src)}" poster="${url(m.poster)}" controls muted playsinline preload="none" aria-label="${escapeHtml(m.alt)}"></video>${figcaption(m)}</figure>`;
    case 'model':
      return `<figure class="media media--model" data-model="${url(m.src)}"><img src="${url(m.poster)}" alt="${escapeHtml(m.alt)}" loading="lazy" decoding="async">${figcaption(m)}</figure>`;
    case 'code':
      return `<figure class="media media--code"><pre tabindex="0"><code>${escapeHtml(m.code ?? '')}</code></pre>${figcaption(m)}</figure>`;
    case 'link':
      return `<a class="media media--link" href="${escapeHtml(withBase(base, m.src))}"><span>${escapeHtml(m.caption)}</span><span aria-hidden="true">↗</span></a>`;
    default:
      throw new Error(`unknown media type "${m.type}"`);
  }
}

function worldOptionsFor(project, base) {
  const options = { ...(project.worldOptions || {}) };
  if (options.cover) options.cover = assetUrl(base, project.id, options.cover);
  return options;
}

export function renderChapter(project, index, base) {
  const n = pad2(index + 1);
  const id = escapeHtml(project.id);
  const font = project.font ? ` font-${project.font}` : '';
  const meta = [n, formatDate(project.date), ...project.tags].map(escapeHtml).join(' · ');
  const badge = project.status === 'in-progress' ? '<p class="badge">In progress</p>' : '';
  const links = (project.links || []).map((l) => `<a href="${escapeHtml(withBase(base, l.href))}">${escapeHtml(l.label)}</a>`).join('');
  const media = project.media.map((m) => renderMedia(m, project, base)).join('');
  const cards = [['The idea', project.cards.idea], ['How it was built', project.cards.built], ['Inside', project.cards.inside]]
    .map(([heading, text]) => `<article class="card"><h4>${heading}</h4><p>${escapeHtml(text)}</p></article>`)
    .join('');
  const options = escapeHtml(JSON.stringify(worldOptionsFor(project, base)));
  return `<section class="scene chapter" id="${id}" data-scene-id="${id}" data-world="${escapeHtml(project.world)}" data-world-options="${options}" data-number="${n}" data-title="${escapeHtml(project.title)}" data-short="${escapeHtml(project.shortTitle || project.title)}" aria-labelledby="${id}-title">
  <div class="scene__track"><div class="scene__frame">
    ${posterImg(project.id, base, true)}
    <p class="chapter__meta mono">${meta}</p>${badge}
    <h2 class="chapter__title${font}" id="${id}-title">${escapeHtml(project.title)}</h2>
    <p class="chapter__hook">${escapeHtml(project.hook)}</p>
  </div></div>
  <div class="chapter__panel">
    <div class="panel__row"><h3 class="panel__headline">${escapeHtml(project.headline)}</h3><div class="panel__body">${paragraphs(project.summary)}${links ? `<p class="panel__links">${links}</p>` : ''}</div></div>
    <div class="panel__media">${media}</div>
    <div class="panel__cards">${cards}</div>
  </div>
</section>`;
}

export function renderMenuItems(projects) {
  const items = projects.map((p, i) =>
    `<li><a class="menu__link" href="#${escapeHtml(p.id)}" data-target="${escapeHtml(p.id)}"><span class="mono">${pad2(i + 1)}</span><span>${escapeHtml(p.title)}</span></a></li>`);
  items.push(`<li class="menu__soon" aria-disabled="true"><span class="mono">${pad2(projects.length + 1)}</span><span>Coming soon</span></li>`);
  return items.join('');
}

export const renderHeroLinks = (projects) =>
  projects.map((p) => `<a href="#${escapeHtml(p.id)}">${escapeHtml(p.shortTitle || p.title)}</a>`).join('');

export const renderCount = (n) => `${n} project${n === 1 ? '' : 's'}`;

export function renderPage(html, projects, { base }) {
  const replacements = [
    ['<!--@count-->', renderCount(projects.length)],
    ['<!--@hero-links-->', renderHeroLinks(projects)],
    ['<!--@hero-poster-->', posterImg('hero', base, false)],
    ['<!--@chapters-->', projects.map((p, i) => renderChapter(p, i, base)).join('\n')],
    ['<!--@next-number-->', pad2(projects.length + 1)],
    ['<!--@next-poster-->', posterImg('next', base, true)],
    ['<!--@menu-->', renderMenuItems(projects)],
  ];
  let out = html;
  for (const [marker, value] of replacements) {
    if (!out.includes(marker)) throw new Error(`index.html is missing the ${marker} marker`);
    out = out.split(marker).join(value);
  }
  return out;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run tests/unit/render.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/render.js tests/unit/render.test.js
git commit -m "feat: render chapters, menu and hero links to HTML" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Copy the raw sources and build the live HALCYON page

**Files:**
- Create: `sources.local.json` (gitignored), `tools/copy-sources.mjs`, `tools/lib/halcyon-transform.mjs`, `tools/halcyon.mjs`
- Generated and committed: `public/halcyon/**`
- Test: `tests/unit/halcyon-transform.test.js`, `tests/e2e/halcyon.spec.js`
- Modify: `package.json` (add a script)

**Interfaces:**
- Produces:
  - `raw/` (gitignored) holding `halcyon/`, `tee/{on-black.jpg, mockup.jpg, alt-stump.jpg, print.png, layers/*.png}`, `pico/boot.py` and `pi/{baseline_assembly.glb, README.md}`.
  - `public/halcyon/` (index.html, styles.css, main.js, boot-gate.js, assets/body-wireframe.svg and fonts/fonts.css with fonts/files/*.woff2), served at `<BASE>halcyon/`.
  - `swapFonts(html)`, `lockForm(html)` and `rewriteFontCss(css, prefix) → { css, files }`.

- [ ] **Step 1: Create `sources.local.json`** (gitignored, so it is never committed)

```json
{
  "halcyon": "C:/Users/Oscar/Downloads/Random Vibe Coded Website",
  "tee": "C:/Users/Oscar/Downloads/Poster Tee Assets/Design",
  "pico": "C:/Users/Oscar/Downloads/MicroPico/boot.py",
  "pi": "PASTE THE ASCII MIRROR WORKSPACE FOLDER HERE"
}
```

To find the value for `"pi"`, run:
```bash
ls -d "$LOCALAPPDATA"/Claude-Data/*/scratch-workspaces/*/*/scratch-2026-10-28-*
```
The folder it prints must contain `export/baseline_assembly.glb` and `README.md`. Paste that path into `"pi"` with forward slashes. Keep the path only in this gitignored file, because it contains app account identifiers.

- [ ] **Step 2: Write `tools/copy-sources.mjs` and run it**

```js
// Copies the original project files into raw/ (gitignored). Paths live in sources.local.json.
import fs from 'node:fs/promises';
import path from 'node:path';

const config = JSON.parse(await fs.readFile('sources.local.json', 'utf8'));
const copies = [
  [path.join(config.halcyon, 'index.html'), 'raw/halcyon/index.html'],
  [path.join(config.halcyon, 'styles.css'), 'raw/halcyon/styles.css'],
  [path.join(config.halcyon, 'main.js'), 'raw/halcyon/main.js'],
  [path.join(config.halcyon, 'boot-gate.js'), 'raw/halcyon/boot-gate.js'],
  [path.join(config.halcyon, 'assets', 'body-wireframe.svg'), 'raw/halcyon/assets/body-wireframe.svg'],
  [path.join(config.tee, 'DEAD TIRED - on black shirt.jpg'), 'raw/tee/on-black.jpg'],
  [path.join(config.tee, 'DEAD TIRED - tee mockup.jpg'), 'raw/tee/mockup.jpg'],
  [path.join(config.tee, 'DEAD TIRED - alternative with stump.jpg'), 'raw/tee/alt-stump.jpg'],
  [path.join(config.tee, 'DEAD TIRED - print file (transparent).png'), 'raw/tee/print.png'],
  [config.pico, 'raw/pico/boot.py'],
  [path.join(config.pi, 'export', 'baseline_assembly.glb'), 'raw/pi/baseline_assembly.glb'],
  [path.join(config.pi, 'README.md'), 'raw/pi/README.md'],
];
const layerDir = path.join(config.tee, 'Layers (PNG)');
for (const name of await fs.readdir(layerDir)) {
  if (name.toLowerCase().endsWith('.png')) copies.push([path.join(layerDir, name), path.join('raw/tee/layers', name)]);
}
for (const [from, to] of copies) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
  console.log(`copied ${path.basename(from)} -> ${to}`);
}
```

Run: `node tools/copy-sources.mjs`
Expected: 21 "copied" lines (12 files plus 9 layer PNGs) and no errors.

- [ ] **Step 3: Write the failing transform test**

`tests/unit/halcyon-transform.test.js`:
```js
import { it, expect } from 'vitest';
import { swapFonts, lockForm, rewriteFontCss } from '../../tools/lib/halcyon-transform.mjs';

const head = `<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Michroma&display=swap">
  <link rel="stylesheet" href="styles.css">
</head>`;

it('swaps Google Fonts for the local font stylesheet', () => {
  const out = swapFonts(head);
  expect(out).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  expect(out).toContain('<link rel="stylesheet" href="fonts/fonts.css">');
  expect(out).toContain('<link rel="stylesheet" href="styles.css">');
});

it('locks the consultation form so typed text can never reach a URL', () => {
  const form = `<form class="consult__form" action="#sec-07" method="get">
    <input class="field__input" id="patient" name="patient" type="text" autocomplete="name" required>
    <select class="field__input" id="implant" name="implant"></select>
    <input id="consent" name="consent" type="checkbox" required></form><meta name="viewport" content="x">`;
  const out = lockForm(form);
  expect(out).toContain('<form class="consult__form" autocomplete="off">');
  expect(out).not.toMatch(/<(input|select)[^>]*\sname=/);
  expect(out).not.toContain('autocomplete="name"');
  expect(out).toContain('id="patient"');
  expect(out).toContain('<meta name="viewport"');
});

it('throws if the form is missing, so a changed source is noticed', () => {
  expect(() => lockForm('<p>no form</p>')).toThrow(/form not found/);
});

it('keeps only woff2 sources and lists the files to copy', () => {
  const css = `@font-face {
  font-family: 'Michroma';
  src: url(./files/michroma-latin-400-normal.woff2) format('woff2'), url(./files/michroma-latin-400-normal.woff) format('woff');
  unicode-range: U+0000-00FF;
}`;
  const { css: out, files } = rewriteFontCss(css, 'files/');
  expect(files).toEqual(['michroma-latin-400-normal.woff2']);
  expect(out).toContain("src: url(files/michroma-latin-400-normal.woff2) format('woff2');");
  expect(out).not.toContain('.woff)');
});
```

Run: `npx vitest run tests/unit/halcyon-transform.test.js`
Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 4: Implement `tools/lib/halcyon-transform.mjs`**

```js
export function swapFonts(html) {
  const out = html
    .replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*>\r?\n?/g, '')
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]*">/, '<link rel="stylesheet" href="fonts/fonts.css">');
  if (/fonts\.(googleapis|gstatic)\.com/.test(out)) throw new Error('HALCYON still references Google Fonts after swapFonts');
  return out;
}

export function lockForm(html) {
  const out = html
    .replace(/<form class="consult__form"[^>]*>/, '<form class="consult__form" autocomplete="off">')
    .replace(/(<(?:input|select|textarea)\b[^>]*?)\s+name="[^"]*"/g, '$1')
    .replace(/autocomplete="name"/g, 'autocomplete="off"');
  if (!out.includes('<form class="consult__form" autocomplete="off">')) throw new Error('HALCYON consultation form not found');
  return out;
}

export function rewriteFontCss(css, prefix) {
  const files = [];
  const out = css.replace(/src:\s*url\(\.\/files\/([^)]+?\.woff2)\)\s*format\(['"]woff2['"]\)[^;]*;/g, (_, name) => {
    files.push(name);
    return `src: url(${prefix}${name}) format('woff2');`;
  });
  if (!files.length) throw new Error('no woff2 files found in font CSS');
  return { css: out, files };
}
```

Run: `npx vitest run tests/unit/halcyon-transform.test.js`
Expected: all PASS.

- [ ] **Step 5: Write `tools/halcyon.mjs`, add the script and run it**

```js
// Builds public/halcyon/: the original page with self-hosted fonts and a form that can't submit anywhere.
import fs from 'node:fs/promises';
import path from 'node:path';
import { swapFonts, lockForm, rewriteFontCss } from './lib/halcyon-transform.mjs';

const SRC = 'raw/halcyon';
const OUT = 'public/halcyon';
const FONT_CSS = [
  '@fontsource/ibm-plex-mono/400.css',
  '@fontsource/ibm-plex-mono/500.css',
  '@fontsource/michroma/400.css',
  '@fontsource/noto-sans-jp/400.css',
  '@fontsource/noto-sans-jp/700.css',
];

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(path.join(OUT, 'assets'), { recursive: true });
await fs.mkdir(path.join(OUT, 'fonts', 'files'), { recursive: true });

const html = await fs.readFile(path.join(SRC, 'index.html'), 'utf8');
await fs.writeFile(path.join(OUT, 'index.html'), lockForm(swapFonts(html)));
for (const file of ['styles.css', 'main.js', 'boot-gate.js', 'assets/body-wireframe.svg']) {
  await fs.copyFile(path.join(SRC, file), path.join(OUT, file));
}

let css = '';
for (const spec of FONT_CSS) {
  const file = path.join('node_modules', ...spec.split('/'));
  const { css: rewritten, files } = rewriteFontCss(await fs.readFile(file, 'utf8'), 'files/');
  for (const name of files) await fs.copyFile(path.join(path.dirname(file), 'files', name), path.join(OUT, 'fonts', 'files', name));
  css += `/* ${spec} */\n${rewritten}\n`;
}
await fs.writeFile(path.join(OUT, 'fonts', 'fonts.css'), css);
console.log(`HALCYON copy written to ${OUT}`);
```

In `package.json` `"scripts"`, add: `"halcyon": "node tools/halcyon.mjs"`.

Run: `npm run halcyon`
Expected: prints "HALCYON copy written to public/halcyon". `public/halcyon/fonts/files/` contains `.woff2` files only.

Run: `grep -c "fonts.googleapis" public/halcyon/index.html`
Expected: `0`.

- [ ] **Step 6: Write and run the browser test**

`tests/e2e/halcyon.spec.js`:
```js
import { test, expect } from '@playwright/test';

const LOCAL = new Set(['localhost', '127.0.0.1']);

test('the HALCYON copy loads its own fonts with no third-party requests', async ({ page }) => {
  const outside = [];
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.protocol.startsWith('http') && !LOCAL.has(u.hostname)) outside.push(req.url());
  });
  await page.goto('halcyon/');
  await expect(page.locator('#sec-01-title')).toHaveAttribute('aria-label', 'Perfection, installed.');
  const loaded = await page.evaluate(async () => (await document.fonts.load('400 16px "IBM Plex Mono"')).length);
  expect(loaded).toBeGreaterThan(0);
  expect(outside).toEqual([]);
});

test('the HALCYON form keeps typed text out of the URL', async ({ page }) => {
  await page.goto('halcyon/');
  await expect(page.locator('.consult__form [name]')).toHaveCount(0);
  expect(await page.locator('.consult__form').getAttribute('action')).toBeNull();
});
```

Run: `npx playwright test tests/e2e/halcyon.spec.js`
Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add tools/copy-sources.mjs tools/lib/halcyon-transform.mjs tools/halcyon.mjs public/halcyon tests/unit/halcyon-transform.test.js tests/e2e/halcyon.spec.js package.json
git commit -m "feat: serve a self-hosted, locked-down copy of HALCYON at /halcyon/" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Covers, screenshots and published media

**Files:**
- Create: `tools/lib/browser.mjs`, `tools/lib/static-server.mjs`, `tools/covers/ascii.html`, `tools/covers/pico.html`, `tools/covers.mjs`, `tools/capture-halcyon.mjs`, `tools/publish-media.mjs`, `tools/check-media.mjs`
- Generated and committed: `public/projects/**`
- Modify: `package.json` (add scripts)

**Interfaces:**
- Consumes: `raw/` from Task 6.
- Produces:
  - `launch()`, which gives a Playwright browser (Edge + SwiftShader).
  - `serveDir(dir) → Promise<{ url, close }>`.
  - These published files:
    - `public/projects/halcyon-somatics/`: `shot-hero.webp`, `shot-hero-900.webp`, `shot-seraph(-900).webp`, `shot-terms(-900).webp` and `cover.webp`.
    - `public/projects/ascii-mirror/`: `cover.webp` and `cover-900.webp`.
    - `public/projects/pico-light-show/`: `cover.webp`, `cover-900.webp` and `boot.py`.
    - `public/projects/dead-tired/`: `on-black(-900).webp`, `mockup(-900).webp`, `alt-stump(-900).webp` and `cover.webp`.
  - The npm script `media`, which reruns the whole pipeline.

- [ ] **Step 1: Write the shared helpers**

`tools/lib/browser.mjs`:
```js
import { chromium } from '@playwright/test';

const channel = process.env.PW_CHANNEL || 'msedge';

export function launch() {
  return chromium.launch({
    ...(channel === 'chromium' ? {} : { channel }),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
}
```

`tools/lib/static-server.mjs`:
```js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json',
};

export function serveDir(dir) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  })));
}
```

- [ ] **Step 2: Write the two cover pages**

`tools/covers/ascii.html`:
```html
<!doctype html>
<meta charset="utf-8">
<title>ASCII Mirror cover</title>
<style>html, body { margin: 0; background: #020604; } canvas { display: block; }</style>
<canvas width="1600" height="1000"></canvas>
<script>
  const canvas = document.querySelector('canvas');
  const g = canvas.getContext('2d');
  const RAMP = ' .:-=+*#%@';
  let seed = 3;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  // A head-and-shoulders silhouette lit from the left, in square coordinates (0..1).
  function figure(u, v) {
    const head = 1 - Math.hypot((u - 0.5) / 0.07, (v - 0.27) / 0.1);
    const neck = Math.abs(u - 0.5) < 0.028 && v > 0.35 && v < 0.43 ? 0.55 : 0;
    const half = 0.1 + Math.max(0, v - 0.42) * 0.55;
    const shoulders = v > 0.41 ? 1 - Math.abs(u - 0.5) / Math.min(0.2, half + 0.06) : 0;
    const torso = v > 0.43 ? (1 - Math.abs(u - 0.5) / half) * 1.1 : 0;
    const light = 0.55 + 0.45 * clamp(1 - (u - 0.38) / 0.3);
    return clamp(Math.max(head, neck, shoulders * 0.8, torso) * light);
  }
  const cell = 16, cw = cell * 0.62;
  g.fillStyle = '#020604';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.font = `${cell}px Consolas, "Courier New", monospace`;
  g.textBaseline = 'top';
  for (let y = 0; y < canvas.height / cell; y++) {
    for (let x = 0; x < canvas.width / cw; x++) {
      const u = (x * cw) / canvas.width, v = (y * cell) / canvas.height;
      const b = clamp(Math.pow(figure(u * 1.6 - 0.3, v), 0.7) + (rand() - 0.5) * 0.12);
      if (b < 0.06) continue;
      const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(b * RAMP.length))];
      if (ch === ' ') continue;
      g.fillStyle = `rgba(57, 255, 136, ${0.35 + b * 0.65})`;
      g.fillText(ch, x * cw, y * cell);
    }
  }
  window.coverReady = true;
</script>
```

`tools/covers/pico.html`:
```html
<!doctype html>
<meta charset="utf-8">
<title>Pico Light Show cover</title>
<style>html, body { margin: 0; background: #07070b; } canvas { display: block; }</style>
<canvas width="1600" height="1000"></canvas>
<script>
  const canvas = document.querySelector('canvas');
  const g = canvas.getContext('2d');
  g.fillStyle = '#07070b';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const N = 20, head = 13, tail = 8;
  for (let i = 0; i < N; i++) {
    const x = 170 + i * (1260 / (N - 1));
    const y = 560 - Math.sin((Math.PI * i) / (N - 1)) * 110;
    const d = head - i;
    const k = d >= 0 && d < tail ? 1 - d / tail : 0;
    const hue = (300 - d * 34 + 360) % 360;
    if (k > 0) {
      const r = 30 + 120 * k;
      const glow = g.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, `hsla(${hue}, 100%, 62%, ${0.85 * k})`);
      glow.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      g.fillStyle = glow;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = k > 0 ? `hsl(${hue}, 100%, ${62 + 30 * k}%)` : '#22222c';
    g.beginPath(); g.arc(x, y, 17, 0, Math.PI * 2); g.fill();
  }
  window.coverReady = true;
</script>
```

- [ ] **Step 3: Write the capture and publish tools**

`tools/covers.mjs`:
```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from './lib/browser.mjs';

await fs.mkdir('raw/covers', { recursive: true });
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  for (const name of ['ascii', 'pico']) {
    await page.goto(pathToFileURL(path.resolve(`tools/covers/${name}.html`)).href);
    await page.waitForFunction(() => window.coverReady === true);
    await page.locator('canvas').screenshot({ path: `raw/covers/${name}.png` });
    console.log(`rendered raw/covers/${name}.png`);
  }
} finally {
  await browser.close();
}
```

`tools/capture-halcyon.mjs`:
```js
import fs from 'node:fs/promises';
import { launch } from './lib/browser.mjs';
import { serveDir } from './lib/static-server.mjs';

await fs.mkdir('raw/shots', { recursive: true });
const server = await serveDir('public');
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => { try { sessionStorage.setItem('hs-booted', '1'); } catch { /* blocked */ } });
  await page.goto(`${server.url}/halcyon/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'raw/shots/halcyon-hero.png' });
  console.log('captured raw/shots/halcyon-hero.png');
  for (const [id, name] of [['sec-02', 'seraph'], ['sec-06', 'terms']]) {
    await page.evaluate((sel) => document.getElementById(sel).scrollIntoView({ block: 'start' }), id);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `raw/shots/halcyon-${name}.png` });
    console.log(`captured raw/shots/halcyon-${name}.png`);
  }
} finally {
  await browser.close();
  await server.close();
}
```

`tools/publish-media.mjs`:
```js
// Converts raw images to WebP (1800 px plus a 900 px "-900" version) with all metadata stripped.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const P = 'public/projects';
const JOBS = [
  { from: 'raw/shots/halcyon-hero.png', to: `${P}/halcyon-somatics/shot-hero.webp` },
  { from: 'raw/shots/halcyon-seraph.png', to: `${P}/halcyon-somatics/shot-seraph.webp` },
  { from: 'raw/shots/halcyon-terms.png', to: `${P}/halcyon-somatics/shot-terms.webp` },
  { from: 'raw/shots/halcyon-hero.png', to: `${P}/halcyon-somatics/cover.webp`, width: 1200, single: true },
  { from: 'raw/covers/ascii.png', to: `${P}/ascii-mirror/cover.webp` },
  { from: 'raw/covers/pico.png', to: `${P}/pico-light-show/cover.webp` },
  { from: 'raw/tee/on-black.jpg', to: `${P}/dead-tired/on-black.webp` },
  { from: 'raw/tee/mockup.jpg', to: `${P}/dead-tired/mockup.webp` },
  { from: 'raw/tee/alt-stump.jpg', to: `${P}/dead-tired/alt-stump.webp` },
  { from: 'raw/tee/print.png', to: `${P}/dead-tired/cover.webp`, width: 1200, single: true, flatten: '#000000' },
];
const COPIES = [{ from: 'raw/pico/boot.py', to: `${P}/pico-light-show/boot.py` }];

async function toWebp(from, to, width, flatten) {
  let image = sharp(from).rotate().resize({ width, withoutEnlargement: true });
  if (flatten) image = image.flatten({ background: flatten });
  await image.webp({ quality: 82, effort: 5 }).toFile(to); // sharp drops EXIF/XMP/IPTC unless asked to keep them
}

for (const job of JOBS) {
  await fs.mkdir(path.dirname(job.to), { recursive: true });
  await toWebp(job.from, job.to, job.width ?? 1800, job.flatten);
  if (!job.single) await toWebp(job.from, job.to.replace(/\.webp$/, '-900.webp'), 900, job.flatten);
  console.log(`wrote ${job.to}`);
}
for (const copy of COPIES) {
  await fs.mkdir(path.dirname(copy.to), { recursive: true });
  await fs.copyFile(copy.from, copy.to);
  console.log(`copied ${copy.to}`);
}
```

`tools/check-media.mjs`:
```js
// Fails if any published image still carries EXIF, XMP or IPTC metadata.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const roots = ['public/projects', 'public/posters'];
const bad = [];
let checked = 0;
async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else if (/\.(webp|png|jpe?g)$/i.test(e.name)) {
      const meta = await sharp(full).metadata();
      checked++;
      if (meta.exif || meta.xmp || meta.iptc) bad.push(full);
    }
  }
}
for (const root of roots) await walk(root);
if (bad.length) { console.error(`Images still carry metadata:\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log(`${checked} images checked: no EXIF, XMP or IPTC metadata.`);
```

In `package.json` `"scripts"`, add:
```json
"media": "node tools/copy-sources.mjs && node tools/halcyon.mjs && node tools/covers.mjs && node tools/capture-halcyon.mjs && node tools/publish-media.mjs && node tools/check-media.mjs",
"check:media": "node tools/check-media.mjs"
```

- [ ] **Step 4: Run the full media pipeline**

Run: `npm run media`
Expected: it ends with "N images checked: no EXIF, XMP or IPTC metadata." with N = 18.

Run: `ls public/projects/*`
Expected: the files listed under Interfaces.

- [ ] **Step 5: Look at the outputs**

Open `raw/shots/halcyon-hero.png`, `raw/covers/ascii.png` and `raw/covers/pico.png` with the Read tool and check that:
- the HALCYON shot shows the hero (not a boot overlay or a blank page);
- the ASCII cover shows a green head-and-shoulders figure;
- the Pico cover shows a row of LEDs with a rainbow comet.

If the HALCYON shot shows the boot overlay, raise the first `waitForTimeout` to 6000 and rerun `node tools/capture-halcyon.mjs && node tools/publish-media.mjs`.

- [ ] **Step 6: Commit**

```bash
git add tools package.json public/projects
git commit -m "feat: add media pipeline: covers, HALCYON screenshots, metadata-free WebP" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Project content, build-time page render and page styles

**Files:**
- Create: `src/content/projects.js`, `plugins/chapters.js`, `tools/check-content.mjs`, `src/styles/layout.css`, `src/styles/chapter.css`, `privacy.local.json` (gitignored)
- Modify: `vite.config.js`, `src/main.js`, `package.json`
- Test: `tests/unit/chapters-plugin.test.js`, `tests/unit/content.test.js`, `tests/unit/privacy.test.js`, `tests/e2e/content.spec.js`

**Interfaces:**
- Consumes: `validateProjects`, `WORLD_NAMES` and `renderPage` from earlier tasks; the published media from Task 7.
- Produces:
  - `projects` (the array).
  - `sliceLines(text, [from, to]?)`.
  - `prepareProjects(list, publicDir): Promise<list>`, which is async. It attaches `code` to code media, and `hasSmall`, `width` and `height` to image media.
  - `checkProjects(list, publicDir)`, which throws an Error listing every problem.
  - `publicIndexRewrite(base, publicDir)`, a connect middleware. It lets the dev server serve `public/<dir>/index.html` for `/<dir>/`, such as `/halcyon/`.
  - The default export `chapters({ base, list? })`, a Vite plugin.
  - The DOM classes the app relies on: `.scene`, `.scene__track`, `.scene__frame`, `.scene__poster`, `.chapter`, `.chapter__panel`, `.hero`, `.next`, `html.webgl`, `.scene.is-live`, `.scene.is-failed` and `html.still`.
  - The npm script `check`.

- [ ] **Step 1: Write `src/content/projects.js`**

```js
// Every chapter on the site comes from this list, in this order.
// To add a project: copy TEMPLATE below into the list, fill it in, put its files in
// public/projects/<id>/, then run `npm run check` and `npm run posters`. See CLAUDE.md.
//
// const TEMPLATE = {
//   id: 'my-project',                 // kebab-case; also the media folder name
//   title: 'My Project',
//   shortTitle: 'Project',            // optional: shorter name for the pill and hero links
//   hook: 'One line that makes people want to scroll.',
//   date: '2026-12',                  // YYYY-MM
//   status: 'done',                   // 'done' or 'in-progress'
//   tags: ['Tag one', 'Tag two'],     // 1 to 5
//   world: 'picture',                 // 'picture' turns cover.webp into particles
//   worldOptions: { cover: 'cover.webp', palette: ['#ffffff'] },
//   font: 'mono',                     // optional: 'michroma', 'big-shoulders' or 'mono'
//   headline: 'A short, punchy line.',
//   summary: 'One or two short paragraphs.\n\nSeparate paragraphs with a blank line.',
//   cards: { idea: 'What I wanted.', built: 'Who did what.', inside: 'What it is made of.' },
//   media: [{ type: 'image', src: 'shot.webp', alt: 'What the image shows', caption: 'Optional caption' }],
//   links: [{ label: 'Visit it', href: 'https://example.com' }],
// };

export const projects = [
  {
    id: 'halcyon-somatics',
    title: 'HALCYON SOMATICS',
    shortTitle: 'HALCYON',
    hook: 'A fake cyberware megacorp, with the horror hidden in the fine print.',
    date: '2026-09',
    status: 'done',
    tags: ['HTML', 'CSS', 'JavaScript'],
    world: 'picture',
    worldOptions: { cover: 'cover.webp', palette: ['#e6f4f7', '#7fb8c4', '#0b1a1f'] },
    font: 'michroma',
    headline: 'Perfection, installed.',
    summary: "I wanted a just-for-fun website for a company that doesn't exist: a luxury implant clinic in a rain-soaked future city. Claude Code and I planned it as a design spec first, then built it piece by piece: a boot sequence, decrypting headlines, a stock ticker, implant spec sheets and a consultation form that goes nowhere.\n\nIt all runs from one HTML page with no build step. You can try the real thing below.",
    cards: {
      idea: 'A cyberpunk megacorp landing page with its own brand, products and voice: calm and luxurious on the surface, quietly horrifying in the side effects and the terms.',
      built: 'I chose the direction and the mood. Claude Code wrote the spec and the plan, then built it in 13 commits, checking contrast, reduced motion and a 360 px phone layout along the way.',
      inside: 'Plain HTML, CSS and JavaScript. Michroma and IBM Plex Mono type, clip-path panels, a pointer-tilt effect, and Node tests for the helper functions.',
    },
    media: [
      { type: 'image', src: 'shot-hero.webp', alt: 'The HALCYON SOMATICS homepage: a wireframe body with callouts beside the headline "Perfection, installed."', caption: 'The hero: a wireframe body, callouts and a headline that decrypts itself.' },
      { type: 'image', src: 'shot-seraph.webp', alt: 'The SERAPH-9 implant spec plate on the HALCYON SOMATICS page', caption: 'SERAPH-9, the flagship implant, with its spec plate.' },
      { type: 'image', src: 'shot-terms.webp', alt: 'The "Terms of installation" section of the HALCYON SOMATICS page', caption: 'The terms of installation nobody reads.' },
      { type: 'link', src: '/halcyon/', caption: 'Open the live HALCYON page' },
    ],
    links: [{ label: 'Visit the live page', href: '/halcyon/' }],
  },
  {
    id: 'ascii-mirror',
    title: 'ASCII Mirror',
    hook: 'A camera that redraws the people walking past as live ASCII art.',
    date: '2026-11',
    status: 'in-progress',
    tags: ['Raspberry Pi 5', 'AI HAT+', 'OpenSCAD', '3D printing', 'Python'],
    world: 'picture',
    worldOptions: { cover: 'cover.webp', palette: ['#39ff88', '#0f5c33', '#b6ffd2'] },
    font: 'mono',
    headline: 'Only the people, drawn in text.',
    summary: "The plan: point a camera at a hallway, and everyone who walks past shows up on a TV as a glowing ASCII-art copy of themselves, only for as long as they're in view.\n\nClaude Code modelled my Raspberry Pi 5, AI HAT+ and Camera Module 3 from the official drawings, designed a camera mount around the screws I actually had, and wrote a Windows demo of the effect. The mount is printed and the hardware is built. The software on the Pi is next.",
    cards: {
      idea: 'A live mirror for passers-by: only people get drawn, nothing is ever recorded, and each copy disappears the moment its person leaves the frame.',
      built: 'Claude Code turned official STEP files into a 3D model of my exact setup, checked the parts for collisions, then designed a mount the camera slides into. I printed it.',
      inside: 'A Raspberry Pi 5 with an AI HAT+ (13 TOPS) and Camera Module 3, an OpenSCAD model with a fit-check script, and a Python demo that draws a moving figure in neon ASCII.',
    },
    media: [
      { type: 'image', src: 'cover.webp', alt: 'A figure drawn in green ASCII characters on a black background', caption: 'The look: brightness becomes characters, from dots up to @ signs.' },
    ],
  },
  {
    id: 'pico-light-show',
    title: 'Pico Light Show',
    shortTitle: 'Pico',
    hook: 'Seven LED effects for a 20-pixel strip, running on a Raspberry Pi Pico.',
    date: '2026-09',
    status: 'done',
    tags: ['MicroPython', 'Raspberry Pi Pico', 'WS2812 LEDs'],
    world: 'picture',
    worldOptions: { cover: 'cover.webp', palette: ['#ff3b6b', '#ffb020', '#39d0ff', '#a46bff'] },
    headline: 'Twenty pixels, seven moods.',
    summary: "It started with one request to Claude Code: make the light flow down my NeoPixel strip and bounce back. Claude wrote a rainbow comet, and I kept going until it became a whole light show.\n\nA power-up intro sends two sparks racing in from the ends, colliding in a flash and blooming into a rainbow. Then come rainbow glitter, twin comets that throw sparks every time they cross, fire, a starfield, plasma and a heartbeat, each one crossfading into the next every 15 seconds.",
    cards: {
      idea: 'Make a 20-LED strip on a Pico feel alive: smooth motion, no flicker, and effects that each have their own personality.',
      built: 'Claude Code wrote the first version, a bouncing rainbow comet, and fixed a bug where colour values over 255 bled into the next colour. I built the rest of the show on top of it.',
      inside: "MicroPython driving WS2812 LEDs through the Pico's PIO, a gamma table so fades look smooth to the eye, anti-aliased dots and a steady 50 fps frame timer.",
    },
    media: [
      { type: 'code', src: 'boot.py', lines: [153, 192], caption: 'twin_comets: two comets bounce along the strip and throw off sparks whenever they cross.' },
      { type: 'image', src: 'cover.webp', alt: 'An illustration of twenty LEDs in a row with a rainbow comet trail', caption: 'An illustration of the strip mid-comet.' },
    ],
  },
  {
    id: 'dead-tired',
    title: 'DEAD TIRED',
    hook: 'A graphic tee: a skeleton from a 1543 anatomy book, too tired to stand up straight.',
    date: '2026-11',
    status: 'done',
    tags: ['Photoshop', 'Graphic design', 'Typography'],
    world: 'picture',
    worldOptions: { cover: 'cover.webp', palette: ['#8c1f25', '#bca775', '#f2ede3'] },
    font: 'big-shoulders',
    headline: 'No sleep since 1543.',
    summary: "A T-shirt design for my art class. I found a skeleton plate in Vesalius's 1543 anatomy book, cut it out and coloured the bones myself, then picked a layout with the title sitting behind the figure.\n\nClaude Code helped me find a style and free public-domain assets, and when I got stuck on the last steps, I asked it to compose the final layout from my skeleton: worn red DEAD TIRED type with outline echoes, the skeleton cut into it, and a bottom bar with a low battery.",
    cards: {
      idea: 'A dark, funny tee: a skeleton slumped mid-step under a huge distressed title, as if it gave up on sleep five centuries ago.',
      built: 'I prepared the skeleton and chose the direction. Claude Code built a style kit, found public-domain images and a free font, then composed the final layered Photoshop file when I asked it to.',
      inside: 'Big Shoulders Display Black type, a 1543 Vesalius plate (Fig. 165), a procedural worn-ink texture and 9 separate layers, laid out for a black shirt.',
    },
    media: [
      { type: 'image', src: 'on-black.webp', alt: 'The DEAD TIRED design on a black T-shirt', caption: 'The design on a black shirt.' },
      { type: 'image', src: 'mockup.webp', alt: 'A mockup of a T-shirt printed with the DEAD TIRED design', caption: 'Tee mockup.' },
      { type: 'image', src: 'alt-stump.webp', alt: 'An alternative version of the DEAD TIRED design that keeps the stump', caption: 'The alternative version, with the stump left in.' },
    ],
  },
];
```

Before moving on, check that lines 153–192 of `public/projects/pico-light-show/boot.py` are the whole `twin_comets` function. Run `sed -n '153p;192p' public/projects/pico-light-show/boot.py`. It should print the `def twin_comets(px):` line and the `yield` that ends that function. If the file has changed, update `lines` to match.

- [ ] **Step 2: Write the failing plugin and content tests**

`tests/unit/chapters-plugin.test.js`:
```js
import { it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { sliceLines, prepareProjects, checkProjects, publicIndexRewrite } from '../../plugins/chapters.js';

const webp = (file, width, height) => sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).webp().toFile(file);
const tmpPublic = async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-'));
  const demoDir = path.join(dir, 'projects', 'demo');
  fs.mkdirSync(demoDir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'halcyon'));
  fs.writeFileSync(path.join(dir, 'halcyon', 'index.html'), '<!doctype html>');
  fs.writeFileSync(path.join(demoDir, 'a.py'), 'one\ntwo\nthree\nfour\n');
  await webp(path.join(demoDir, 'shot.webp'), 40, 25);
  await webp(path.join(demoDir, 'shot-900.webp'), 20, 12);
  await webp(path.join(demoDir, 'big.webp'), 30, 30);
  await webp(path.join(demoDir, 'cover.webp'), 10, 10);
  return dir;
};
const demo = {
  id: 'demo', title: 'Demo', hook: 'h', date: '2026-09', status: 'done', tags: ['x'], world: 'picture',
  worldOptions: { cover: 'cover.webp' }, headline: 'h', summary: 's', cards: { idea: 'a', built: 'b', inside: 'c' },
  media: [{ type: 'code', src: 'a.py', lines: [2, 3] }, { type: 'image', src: 'shot.webp', alt: 'x' }, { type: 'image', src: 'big.webp', alt: 'x' }],
};

it('slices code by 1-based inclusive line numbers', () => {
  expect(sliceLines('one\r\ntwo\r\nthree\r\nfour', [2, 3])).toBe('two\nthree');
  expect(sliceLines('all of it\n\n', undefined)).toBe('all of it');
});
it('attaches code text, image sizes and which images have a 900px version', async () => {
  const [p] = await prepareProjects([demo], await tmpPublic());
  expect(p.media[0].code).toBe('two\nthree');
  expect(p.media[1]).toMatchObject({ hasSmall: true, width: 40, height: 25 });
  expect(p.media[2]).toMatchObject({ hasSmall: false, width: 30, height: 30 });
});
it('throws one error listing every problem', async () => {
  const broken = { ...demo, title: '', media: [{ type: 'image', src: 'gone.webp', alt: 'x' }] };
  const dir = await tmpPublic();
  expect(() => checkProjects([broken], dir)).toThrow(/"title" is required[\s\S]*gone\.webp/);
});
it('lets the dev server open folder pages from public/, like /halcyon/', async () => {
  const rewrite = publicIndexRewrite('/', await tmpPublic());
  const run = (url) => { const req = { url }; rewrite(req, {}, () => {}); return req.url; };
  expect(run('/halcyon/')).toBe('/halcyon/index.html');
  expect(run('/halcyon/?x=1')).toBe('/halcyon/index.html?x=1');
  expect(run('/')).toBe('/');
  expect(run('/projects/')).toBe('/projects/');
});
```

`tests/unit/content.test.js`:
```js
import { it, expect } from 'vitest';
import path from 'node:path';
import { projects } from '../../src/content/projects.js';
import { checkProjects } from '../../plugins/chapters.js';

it('the real project list passes the build check', () => {
  expect(() => checkProjects(projects, path.resolve('public'))).not.toThrow();
});
it('launches with the four approved projects in order', () => {
  expect(projects.map((p) => p.id)).toEqual(['halcyon-somatics', 'ascii-mirror', 'pico-light-show', 'dead-tired']);
});
```

`tests/unit/privacy.test.js`:
```js
// Guards the public repo: tracked files and commit messages must never contain the words in
// privacy.local.json (gitignored). Skipped where that file doesn't exist (e.g. CI).
import { it, expect } from 'vitest';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const local = fs.existsSync('privacy.local.json') ? JSON.parse(fs.readFileSync('privacy.local.json', 'utf8')) : null;
const TEXT = /\.(js|mjs|json|md|html|css|svg|py|yml|txt)$/i;

it.skipIf(!local)('no tracked file or commit message contains a private word', () => {
  const words = local.forbidden.map((w) => w.toLowerCase());
  const hits = [];
  const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter((f) => f && TEXT.test(f));
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8').toLowerCase();
    for (const w of words) if (text.includes(w)) hits.push(`${f} contains a private word`);
  }
  const log = execSync('git log --format=%an%n%ae%n%B', { encoding: 'utf8' }).toLowerCase();
  for (const w of words) if (log.includes(w)) hits.push('a commit message or author contains a private word');
  expect(hits).toEqual([]);
});
```

Run: `npx vitest run tests/unit/chapters-plugin.test.js tests/unit/content.test.js`
Expected: FAIL, because `plugins/chapters.js` doesn't exist yet.

- [ ] **Step 3: Implement `plugins/chapters.js` and `tools/check-content.mjs`**

`plugins/chapters.js`:
```js
// Vite plugin: checks src/content/projects.js and renders it into index.html at build (and dev) time.
import fs from 'node:fs';
import path from 'node:path';
import { projects } from '../src/content/projects.js';
import { validateProjects } from '../src/content/validate.js';
import { WORLD_NAMES } from '../src/worlds/names.js';
import { renderPage } from '../src/content/render.js';
import sharp from 'sharp';

export function sliceLines(text, lines) {
  if (!lines) return text.replace(/\s+$/, '');
  const [from, to] = lines;
  return text.split(/\r?\n/).slice(from - 1, to).join('\n');
}

// Adds what the renderer needs but authors shouldn't have to type: code text, image sizes, 900px variants.
export async function prepareProjects(list, publicDir) {
  return Promise.all(list.map(async (p) => {
    const file = (name) => path.join(publicDir, 'projects', p.id, name);
    const media = await Promise.all(p.media.map(async (m) => {
      if (m.type === 'code') return { ...m, code: sliceLines(fs.readFileSync(file(m.src), 'utf8'), m.lines) };
      if (m.type === 'image') {
        const { width, height } = await sharp(file(m.src)).metadata();
        const hasSmall = /\.webp$/i.test(m.src) && fs.existsSync(file(m.src.replace(/\.webp$/i, '-900.webp')));
        return { ...m, width, height, hasSmall };
      }
      return m;
    }));
    return { ...p, media };
  }));
}

// The dev server doesn't serve folder index pages from public/ (e.g. /halcyon/); this rewrites them.
export function publicIndexRewrite(base, publicDir) {
  return (req, _res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith(base)) {
      const rel = url.pathname.slice(base.length);
      if (rel && rel.endsWith('/') && fs.existsSync(path.join(publicDir, rel, 'index.html'))) {
        req.url = `${base}${rel}index.html${url.search}`;
      }
    }
    next();
  };
}

export function checkProjects(list, publicDir) {
  const errors = validateProjects(list, { worldNames: WORLD_NAMES, fileExists: (rel) => fs.existsSync(path.join(publicDir, rel)) });
  if (errors.length) throw new Error(`Content check failed (src/content/projects.js):\n  - ${errors.join('\n  - ')}`);
}

export default function chapters({ base, list = projects }) {
  let publicDir = path.resolve('public');
  return {
    name: 'portfolio-chapters',
    configResolved(config) { publicDir = config.publicDir; },
    configureServer(server) { server.middlewares.use(publicIndexRewrite(base, publicDir)); },
    buildStart() { checkProjects(list, publicDir); },
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        checkProjects(list, publicDir);
        return renderPage(html, await prepareProjects(list, publicDir), { base });
      },
    },
  };
}
```

`tools/check-content.mjs`:
```js
import path from 'node:path';
import { projects } from '../src/content/projects.js';
import { checkProjects } from '../plugins/chapters.js';

try {
  checkProjects(projects, path.resolve('public'));
  console.log(`Content OK: ${projects.length} projects.`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
```

Replace `vite.config.js` with:
```js
import { defineConfig } from 'vite';
import { BASE } from './site.config.js';
import chapters from './plugins/chapters.js';

export default defineConfig({
  base: BASE,
  plugins: [chapters({ base: BASE })],
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 800 },
  server: { port: 5173 },
});
```

In `package.json` `"scripts"`, add `"check": "node tools/check-content.mjs"`.

Run: `npx vitest run tests/unit/chapters-plugin.test.js tests/unit/content.test.js`
Expected: all PASS.

Run: `npm run check`
Expected: `Content OK: 4 projects.`

- [ ] **Step 4: Create `privacy.local.json` and run the privacy test**

Create `privacy.local.json`, which is gitignored and must **never** be committed or quoted anywhere:
```json
{ "forbidden": ["<surname>", "<school name>", "<state>", "<email address>"] }
```
Replace each `<...>` with Oscar's real surname, school name, state and personal email address. Take them from your memory of this user, or ask Oscar. Use full, distinctive names only. Short generic words, like an assignment's task number, also appear in this plan ("Task 10") and would trip the test. Never write these values into any other file, commit message or chat summary.

Run: `npx vitest run tests/unit/privacy.test.js`
Expected: PASS. If it fails, remove the private word from the named file. For a commit message, run `git commit --amend` only if it is the latest unpushed commit. Otherwise stop and tell Oscar.

- [ ] **Step 5: Write the layout and chapter styles and import them**

`src/styles/layout.css`:
```css
.stage { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; display: none; }
html.webgl .stage, html.still .stage { display: block; }
html.still main, html.still header, html.still footer, html.still .pill, html.still .menu, html.still .skip { display: none !important; }

.topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; gap: 28px; padding: 14px var(--gutter); font-size: 15px; font-weight: 400; background: linear-gradient(rgba(9, 9, 9, 0.55), rgba(9, 9, 9, 0)); }
.topbar__mark { font-weight: 500; text-decoration: none; letter-spacing: -0.01em; }
.topbar__projects { background: none; border: 0; padding: 0; cursor: pointer; }
.topbar__cta { margin-left: auto; padding: 8px 16px; border-radius: 999px; background: var(--paper); color: var(--ink); text-decoration: none; font-weight: 500; }

main { position: relative; z-index: 1; }
.scene { position: relative; }
.scene__track { position: relative; height: 200vh; }
.scene__frame { position: sticky; top: 0; height: 100vh; overflow: hidden; isolation: isolate; display: flex; flex-direction: column; justify-content: flex-end; padding: 96px var(--gutter) 88px; }
.scene__frame > * { min-width: 0; }
.scene__poster { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; z-index: -2; transition: opacity 0.6s ease; }
html.webgl .scene.is-live .scene__poster { opacity: 0; }
.scene__frame::before { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: linear-gradient(to top, rgba(9, 9, 9, 0.72), rgba(9, 9, 9, 0) 55%); }

.hero .scene__frame { flex-direction: row; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 24px 32px; }
.hero__count { margin: 0; max-width: 22ch; font-size: clamp(16px, 1.6vw, 20px); font-weight: 400; }
.hero__links { display: grid; grid-template-columns: repeat(2, auto); gap: 8px 28px; font-size: 15px; font-weight: 400; }
.hero__links a { text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; }

.next .scene__track { height: 160vh; }
.next .scene__frame { justify-content: center; align-items: center; text-align: center; }
.next__title { margin: 0; font-weight: 200; font-size: clamp(36px, 6vw, 88px); line-height: 1.02; letter-spacing: -0.02em; }
.next__sub { margin: 12px 0 0; color: var(--muted); }
.next__about { position: absolute; left: var(--gutter); right: var(--gutter); bottom: 88px; margin: 0 auto; max-width: 40ch; font-size: 18px; }

.footer { position: relative; z-index: 1; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px 24px; padding: 22px var(--gutter) 96px; border-top: 1px solid var(--faint); background: var(--ink); color: var(--muted); font-size: 14px; }
```

`src/styles/chapter.css`:
```css
.chapter__meta { margin: 0 0 14px; color: var(--muted); }
.badge { align-self: flex-start; margin: 0 0 14px; padding: 4px 10px; border: 1px solid var(--paper); border-radius: 999px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
.chapter__title { margin: 0; max-width: 100%; font-weight: 300; font-size: clamp(44px, 9vw, 150px); line-height: 0.95; letter-spacing: -0.03em; overflow-wrap: break-word; }
.chapter__title.font-michroma { font-size: clamp(26px, 6.4vw, 104px); line-height: 1.05; letter-spacing: 0; }
.chapter__title.font-big-shoulders { font-size: clamp(64px, 13vw, 210px); line-height: 0.85; letter-spacing: 0.01em; }
.chapter__hook { margin: 18px 0 0; max-width: 46ch; font-size: clamp(17px, 1.8vw, 22px); font-weight: 400; }

.chapter__panel { position: relative; z-index: 1; background: var(--ink); padding: clamp(64px, 9vw, 140px) var(--gutter) clamp(72px, 10vw, 160px); }
.panel__row { display: grid; gap: 28px; }
.panel__row > *, .panel__media > *, .panel__cards > * { min-width: 0; }
@media (min-width: 900px) { .panel__row { grid-template-columns: 1.15fr 1fr; gap: 64px; align-items: start; } }
.panel__headline { margin: 0; font-weight: 300; font-size: clamp(38px, 5vw, 72px); line-height: 1.02; letter-spacing: -0.025em; }
.panel__body p { margin: 0 0 14px; color: var(--muted); }
.panel__links { display: flex; flex-wrap: wrap; gap: 10px 22px; }
.panel__links a { color: var(--paper); text-decoration: underline; text-underline-offset: 4px; }
.panel__media { display: grid; gap: 20px; margin-top: clamp(40px, 6vw, 80px); }
@media (min-width: 900px) { .panel__media { grid-template-columns: repeat(2, 1fr); } .panel__media > :first-child { grid-column: 1 / -1; } }
.media { margin: 0; }
.media img, .media video { width: 100%; height: auto; border-radius: var(--radius); background: var(--ink-2); }
.media figcaption { margin-top: 10px; color: var(--muted); font-size: 14px; }
.media--code pre { margin: 0; max-height: 540px; overflow: auto; padding: 20px 22px; border-radius: var(--radius); background: var(--ink-2); border: 1px solid var(--faint); font: 400 13px/1.6 var(--font-mono); color: #d9f7e4; }
.media--link { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 26px 28px; border-radius: var(--radius); background: var(--paper); color: var(--ink); text-decoration: none; font-size: clamp(20px, 2.2vw, 28px); font-weight: 400; }
.media--link:focus-visible { outline-color: var(--paper); }
.panel__cards { display: grid; gap: 28px; margin-top: clamp(48px, 7vw, 96px); }
@media (min-width: 900px) { .panel__cards { grid-template-columns: repeat(3, 1fr); } }
.card { border-top: 1px solid var(--faint); padding-top: 18px; }
.card h4 { margin: 0 0 8px; font-weight: 500; font-size: 17px; }
.card p { margin: 0; color: var(--muted); font-size: 16px; }
```

In `src/main.js`, add these two lines after `import './styles/base.css';`:
```js
import './styles/layout.css';
import './styles/chapter.css';
```

- [ ] **Step 6: Write and run the content browser tests**

`tests/e2e/content.spec.js`:
```js
import { test, expect } from '@playwright/test';
import { projects } from '../../src/content/projects.js';

const pad2 = (n) => String(n).padStart(2, '0');

test('every project in the list renders a chapter', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.hero__count')).toHaveText(`${projects.length} projects built with Claude Code, and counting`);
  await expect(page.locator('section.chapter')).toHaveCount(projects.length);
  for (const [i, p] of projects.entries()) {
    const chapter = page.locator(`#${p.id}`);
    await expect(chapter).toHaveAttribute('data-number', pad2(i + 1));
    await expect(chapter.locator('h2')).toHaveText(p.title);
    await expect(chapter.locator('.chapter__hook')).toHaveText(p.hook);
    await expect(chapter.locator('.panel__headline')).toHaveText(p.headline);
    await expect(chapter.locator('.card')).toHaveCount(3);
  }
  await expect(page.locator('#ascii-mirror .badge')).toHaveText('In progress');
  await expect(page.locator('#next-title')).toHaveText(`Project ${pad2(projects.length + 1)} is loading…`);
  await expect(page.locator('#pico-light-show .media--code code')).toContainText('def twin_comets(px):');
});

for (const width of [375, 1440]) {
  test(`no sideways scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}
```

Run: `npm test`
Expected: all unit tests pass.

Run: `npx playwright test tests/e2e/content.spec.js`
Expected: 3 passed. If the 375 px test fails, find the widest element by running this in the test page:
```js
[...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.className)
```
Then fix that element's CSS, for example by giving it `min-width: 0` or a smaller `clamp()` minimum.

- [ ] **Step 7: Commit**

```bash
git add src/content/projects.js plugins tools/check-content.mjs vite.config.js src/main.js src/styles package.json tests
git commit -m "feat: render the four launch chapters from the project list at build time" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Chapter pill, menu and scroll-aware app (posters only)

**Files:**
- Create: `src/ui/pill.js`, `src/ui/menu.js`, `src/styles/ui.css`, `src/app.js` (version 1, without the 3D stage)
- Modify: `src/main.js`
- Test: `tests/e2e/navigation.spec.js`

**Interfaces:**
- Consumes: `sceneState` (Task 2); the DOM from Task 8 (`.scene` with its `data-*` attributes, `.pill`, `.pill__label`, `#chapter-menu`, and triggers with `aria-controls="chapter-menu"` and `data-menu-placement`).
- Produces:
  - `createPill(root: HTMLElement, scenes): { update(sceneIndex: number) }`. It is hidden for the hero, shows `NN · shortTitle` for chapters and `NN · Coming soon` for the next slot.
  - `createMenu({ menu, triggers, onSelect(id) }): { setCurrent(chapterIndex), isOpen }`.
  - `readScenes(doc): { el, id, world, options }[]`.
  - `startApp({ win, doc }?): Promise<void>`.

- [ ] **Step 1: Write the failing navigation tests**

`tests/e2e/navigation.spec.js`:
```js
import { test, expect } from '@playwright/test';
import { projects } from '../../src/content/projects.js';

const pad2 = (n) => String(n).padStart(2, '0');
const label = (i) => `${pad2(i + 1)} · ${projects[i].shortTitle || projects[i].title}`;
const topOf = (page, id) => page.evaluate((el) => Math.abs(Math.round(document.getElementById(el).getBoundingClientRect().top)), id);
const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('the pill is hidden over the hero and names the chapter you are in', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.pill')).toBeHidden();
  for (const [i, p] of projects.entries()) {
    await scrollToId(page, p.id);
    await expect(page.locator('.pill__label')).toHaveText(label(i));
  }
  await scrollToId(page, 'next');
  await expect(page.locator('.pill__label')).toHaveText(`${pad2(projects.length + 1)} · Coming soon`);
});

test('the menu jumps to every chapter, including from the hero and to the current chapter', async ({ page }) => {
  await page.goto('./');
  for (const p of [...projects, projects[projects.length - 1]]) {
    await page.locator('.topbar__projects').click();
    await expect(page.locator('#chapter-menu')).toBeVisible();
    await page.locator(`#chapter-menu a[data-target="${p.id}"]`).click();
    await expect(page.locator('#chapter-menu')).toBeHidden();
    await expect.poll(() => topOf(page, p.id)).toBeLessThanOrEqual(1);
  }
});

test('the menu works from the keyboard', async ({ page }) => {
  await page.goto('./');
  const button = page.locator('.topbar__projects');
  await button.focus();
  await page.keyboard.press('Enter');
  const links = page.locator('#chapter-menu a.menu__link');
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(links.nth(1)).toBeFocused();
  for (let i = 0; i < projects.length + 2; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.getElementById('chapter-menu').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#chapter-menu')).toBeHidden();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => topOf(page, projects[1].id)).toBeLessThanOrEqual(1);
  await expect(page.locator(`#${projects[1].id}-title`)).toBeFocused();
});

test('a deep link lands on its chapter and the pill names it', async ({ page }) => {
  const last = projects.length - 1;
  await page.goto(`./#${projects[last].id}`);
  await expect(page.locator('.pill__label')).toHaveText(label(last));
});

test('resizing mid-page keeps the pill in sync', async ({ page }) => {
  await page.goto('./');
  await scrollToId(page, projects[2].id);
  await expect(page.locator('.pill__label')).toHaveText(label(2));
  await page.setViewportSize({ width: 375, height: 812 });
  await scrollToId(page, projects[1].id);
  await expect(page.locator('.pill__label')).toHaveText(label(1));
});

test.describe('with smooth scrolling (what most visitors get)', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });
  test('the menu lands exactly on a far chapter', async ({ page }) => {
    await page.goto('./');
    const last = projects[projects.length - 1];
    await page.locator('.topbar__projects').click();
    await page.locator(`#chapter-menu a[data-target="${last.id}"]`).click();
    await expect.poll(() => topOf(page, last.id), { timeout: 10_000 }).toBeLessThanOrEqual(2);
    await page.waitForTimeout(500); // stays put once Lenis settles
    expect(await topOf(page, last.id)).toBeLessThanOrEqual(2);
  });
});
```

Run: `npx playwright test tests/e2e/navigation.spec.js`
Expected: FAIL, because nothing updates the pill or opens the menu yet.

- [ ] **Step 2: Implement the pill and the menu**

`src/ui/pill.js`:
```js
export function createPill(root, scenes) {
  const label = root.querySelector('.pill__label');
  const labels = scenes.map(({ el }) => {
    if (el.classList.contains('chapter')) return `${el.dataset.number} · ${el.dataset.short || el.dataset.title}`;
    if (el.classList.contains('next')) return `${el.dataset.number} · Coming soon`;
    return null; // hero: no pill
  });
  let shown;
  return {
    update(index) {
      if (index === shown) return;
      shown = index;
      const text = labels[index] ?? null;
      root.hidden = !text;
      if (text) label.textContent = text;
    },
  };
}
```

`src/ui/menu.js`:
```js
export function createMenu({ menu, triggers, onSelect }) {
  let open = false;
  let returnTo = null;
  let current = -1;
  const links = () => Array.from(menu.querySelectorAll('a.menu__link'));
  const setExpanded = (value) => triggers.forEach((t) => t.setAttribute('aria-expanded', String(value)));

  function show(trigger) {
    open = true;
    returnTo = trigger;
    menu.classList.toggle('menu--top', trigger?.dataset.menuPlacement === 'top');
    menu.hidden = false;
    setExpanded(true);
    const list = links();
    (list[current] || list[0])?.focus();
  }
  function hide({ restoreFocus = true } = {}) {
    if (!open) return;
    open = false;
    menu.hidden = true;
    setExpanded(false);
    if (restoreFocus && returnTo) returnTo.focus();
  }

  triggers.forEach((t) => t.addEventListener('click', () => (open ? hide() : show(t))));
  menu.addEventListener('keydown', (e) => {
    const list = links();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); hide(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      list[(i + step + list.length) % list.length].focus();
    } else if (e.key === 'Tab') {
      e.preventDefault(); // keep focus inside the open menu
      const step = e.shiftKey ? -1 : 1;
      list[(Math.max(i, 0) + step + list.length) % list.length].focus();
    }
  });
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a.menu__link');
    if (!a) return;
    e.preventDefault();
    hide({ restoreFocus: false });
    onSelect(a.dataset.target);
  });
  document.addEventListener('pointerdown', (e) => {
    if (open && !menu.contains(e.target) && !triggers.some((t) => t.contains(e.target))) hide({ restoreFocus: false });
  });

  return {
    setCurrent(index) {
      if (index === current) return;
      current = index;
      links().forEach((a, j) => (j === index ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    },
    get isOpen() { return open; },
  };
}
```

`src/styles/ui.css`:
```css
.pill { position: fixed; left: 50%; bottom: 18px; z-index: 30; transform: translateX(-50%); }
.pill[hidden] { display: none; }
.pill__button { display: flex; align-items: center; justify-content: space-between; gap: 28px; min-width: 220px; padding: 10px 14px 10px 18px; border: 0; border-radius: 999px; background: var(--paper); color: var(--ink); font-size: 15px; font-weight: 500; cursor: pointer; white-space: nowrap; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); }
.menu { position: fixed; left: 50%; bottom: 70px; z-index: 31; transform: translateX(-50%); min-width: min(320px, calc(100vw - 32px)); padding: 10px; border-radius: 18px; background: var(--paper); color: var(--ink); box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45); }
.menu.menu--top { top: 56px; bottom: auto; left: var(--gutter); transform: none; }
.menu[hidden] { display: none; }
.menu :focus-visible { outline: 2px solid var(--ink); outline-offset: 0; }
.menu__list { list-style: none; margin: 0; padding: 0; }
.menu__link, .menu__soon { display: flex; gap: 12px; padding: 9px 12px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 400; }
.menu__link:hover, .menu__link:focus-visible { background: rgba(9, 9, 9, 0.08); }
.menu__link[aria-current='true'] { font-weight: 500; }
.menu__soon { opacity: 0.45; }
.menu .mono { padding-top: 3px; }
```

- [ ] **Step 3: Write `src/app.js` (version 1) and wire `src/main.js`**

`src/app.js`:
```js
import Lenis from 'lenis';
import { sceneState } from './lib/scroll.js';
import { createMenu } from './ui/menu.js';
import { createPill } from './ui/pill.js';

export function readScenes(doc) {
  return Array.from(doc.querySelectorAll('.scene')).map((el) => ({
    el,
    id: el.dataset.sceneId,
    world: el.dataset.world,
    options: JSON.parse(el.dataset.worldOptions || '{}'),
  }));
}

function measure(scenes, win) {
  const y = win.scrollY;
  const vh = win.innerHeight;
  return scenes.map(({ el }) => {
    const track = el.querySelector('.scene__track') || el;
    return { start: el.getBoundingClientRect().top + y, length: Math.max(1, track.offsetHeight - vh) };
  });
}

export async function startApp({ win = window, doc = document } = {}) {
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = readScenes(doc);

  const lenis = reduced ? null : new Lenis({ autoRaf: false });
  const goTo = (id) => {
    const target = doc.getElementById(id);
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, {
        duration: 1.4,
        // If anything above changed height mid-flight, finish exactly on the target.
        onComplete: () => { if (Math.abs(target.getBoundingClientRect().top) > 2) lenis.scrollTo(target, { immediate: true }); },
      });
    } else target.scrollIntoView({ block: 'start' });
    const heading = target.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  };
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('#chapter-menu')) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || !doc.getElementById(id)) return;
    e.preventDefault();
    goTo(id);
  });

  const pill = createPill(doc.querySelector('.pill'), scenes);
  const menu = createMenu({
    menu: doc.getElementById('chapter-menu'),
    triggers: Array.from(doc.querySelectorAll('[aria-controls="chapter-menu"]')),
    onSelect: goTo,
  });

  let layout = measure(scenes, win);
  let state = sceneState(win.scrollY, win.innerHeight, layout);
  const updateUi = () => {
    state = sceneState(win.scrollY, win.innerHeight, layout);
    pill.update(state.display);
    menu.setCurrent(state.display - 1);
  };
  const remeasure = () => { layout = measure(scenes, win); updateUi(); };
  win.addEventListener('resize', remeasure);
  if ('ResizeObserver' in win) new win.ResizeObserver(remeasure).observe(doc.body);
  doc.fonts?.ready.then(remeasure);
  updateUi();

  if (!lenis) { win.addEventListener('scroll', updateUi, { passive: true }); return; }
  const tick = (now) => { win.requestAnimationFrame(tick); lenis.raf(now); updateUi(); };
  win.requestAnimationFrame(tick);
}
```

Replace `src/main.js` with:
```js
import '@fontsource/hanken-grotesk/200.css';
import '@fontsource/hanken-grotesk/300.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/michroma/400.css';
import '@fontsource/big-shoulders-display/900.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/chapter.css';
import './styles/ui.css';
import { startApp } from './app.js';

startApp().catch((err) => console.error('[app] failed to start', err));
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx playwright test tests/e2e/navigation.spec.js tests/e2e/content.spec.js`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/styles/ui.css src/app.js src/main.js tests/e2e/navigation.spec.js
git commit -m "feat: add floating chapter pill, keyboard-friendly chapter menu and smooth scroll" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The 3D stage, the warp transition and the dormant grid

**Files:**
- Create: `src/stage/transition.js`, `src/stage/stage.js`, `src/worlds/registry.js`, `src/worlds/dormant.js`
- Modify: `src/app.js` (replace it with the final version)
- Test: `tests/unit/registry.test.js`, `tests/e2e/stage.spec.js`

**Interfaces:**
- Consumes: `pickTier`, `TIER_SETTINGS` and `lifecyclePlan`; `readScenes` from Task 9.
- Produces:
  - `createCompositor(renderer): { resize(w, h), render(fromWorld, toWorld, t), dispose() }`.
  - `createStage(canvas, { tierOverride?, onReady(i), onRelease(i), onFail(i, err), onContextLost() })`, returning `{ tier, ensure(i, name, options), release(i), whenReady(i): Promise, frame({ time, delta, state, pointer }), loaded(): Set<number> }`. It throws if WebGL 2 is unavailable.
  - The world context passed to `create(stage, options)` is `{ renderer, tier }`.
  - `worldLoaders: Record<string, () => Promise<module>>`, built from the files in `src/worlds/*.js` except `registry.js` and `names.js`.
  - URL params: `?posters` forces poster mode, `?tier=high|mid|low` overrides the tier, and `?still=<sceneId>&p=<0..1>` renders one world full-screen and then sets `html[data-still-ready]` to `"1"` or `"error"`.
  - `html.webgl` is set when the stage starts; `.scene.is-live` and `.scene.is-failed` are set per scene.

- [ ] **Step 1: Write the failing tests**

`tests/unit/registry.test.js`:
```js
import { it, expect } from 'vitest';
import { worldLoaders } from '../../src/worlds/registry.js';
import { WORLD_NAMES } from '../../src/worlds/names.js';

it('only registers worlds whose names are allowed in content', () => {
  for (const name of Object.keys(worldLoaders)) expect(WORLD_NAMES).toContain(name);
});
it('loads lazily (each entry is a function)', () => {
  for (const load of Object.values(worldLoaders)) expect(typeof load).toBe('function');
});
```

`tests/e2e/stage.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('the 3D stage starts and the next-project grid goes live', async ({ page }) => {
  const crashes = [];
  page.on('pageerror', (e) => crashes.push(e.message));
  await page.goto('./');
  await expect(page.locator('html')).toHaveClass(/webgl/);
  await page.evaluate(() => document.getElementById('next').scrollIntoView());
  await expect(page.locator('#next')).toHaveClass(/is-live/, { timeout: 30_000 });
  expect(crashes).toEqual([]);
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the 3D stage is skipped and posters stay', async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(1000);
    await expect(page.locator('html')).not.toHaveClass(/webgl/);
  });
});

test('without WebGL the page falls back to posters', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  await page.goto('./');
  await page.waitForTimeout(1000);
  await expect(page.locator('html')).not.toHaveClass(/webgl/);
  await expect(page.locator('.hero__count')).toBeVisible();
});

test('still mode renders a single world for posters', async ({ page }) => {
  await page.goto('./?still=next&tier=high');
  await expect(page.locator('html')).toHaveAttribute('data-still-ready', '1', { timeout: 60_000 });
});
```

Run: `npx vitest run tests/unit/registry.test.js`
Expected: FAIL, because `src/worlds/registry.js` doesn't exist yet.

- [ ] **Step 2: Implement the registry, the compositor and the stage**

`src/worlds/registry.js`:
```js
// name -> lazy loader. Every file in this folder (except this one and names.js) is a world named after the file.
// Helpers that are not worlds live in src/worlds/lib/.
const files = import.meta.glob(['./*.js', '!./registry.js', '!./names.js']);

export const worldLoaders = Object.fromEntries(
  Object.entries(files).map(([file, load]) => [file.slice(2, -3), load]),
);
```

`src/stage/transition.js`:
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

// Renders two worlds to textures and blends them with a radial zoom-blur that peaks halfway.
export function createCompositor(renderer) {
  const rtA = new THREE.WebGLRenderTarget(1, 1);
  const rtB = new THREE.WebGLRenderTarget(1, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { tFrom: { value: rtA.texture }, tTo: { value: rtB.texture }, uT: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    resize(width, height) { rtA.setSize(width, height); rtB.setSize(width, height); },
    render(from, to, t) {
      renderer.setRenderTarget(rtA);
      renderer.render(from.scene, from.camera);
      renderer.setRenderTarget(rtB);
      renderer.render(to.scene, to.camera);
      renderer.setRenderTarget(null);
      material.uniforms.uT.value = t;
      renderer.render(scene, camera);
    },
    dispose() { rtA.dispose(); rtB.dispose(); material.dispose(); geometry.dispose(); },
  };
}
```

`src/stage/stage.js`:
```js
import * as THREE from 'three';
import { worldLoaders } from '../worlds/registry.js';
import { pickTier, TIER_SETTINGS } from '../lib/tier.js';
import { createCompositor } from './transition.js';

// Colours pass through untouched everywhere (screen and render targets), so transitions never shift colour.
THREE.ColorManagement.enabled = false;

function gpuName(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  } catch {
    return '';
  }
}

export function createStage(canvas, { tierOverride = null, onReady = () => {}, onRelease = () => {}, onFail = () => {}, onContextLost = () => {} } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL 2 is not available');
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x090909, 1);

  const tier = TIER_SETTINGS[tierOverride] ? tierOverride : pickTier({ gpu: gpuName(gl), cores: navigator.hardwareConcurrency || 4, width: window.innerWidth });
  const { dprCap } = TIER_SETTINGS[tier];
  const compositor = createCompositor(renderer);
  const entries = new Map(); // scene index -> { status, world, ready }
  const ctx = { renderer, tier };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let lost = false;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    compositor.resize(Math.round(width * dpr), Math.round(height * dpr));
    entries.forEach((e) => e.world && e.world.resize(width, height, dpr));
  }
  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); lost = true; onContextLost(); });

  function ensure(index, name, options = {}) {
    if (lost || entries.has(index)) return;
    const entry = { status: 'loading', world: null, ready: null };
    entries.set(index, entry);
    entry.ready = (async () => {
      const load = worldLoaders[name];
      if (!load) throw new Error(`no world called "${name}"`);
      const mod = await load();
      return mod.default.create(ctx, options);
    })().then(
      (world) => {
        if (entries.get(index) !== entry) { world.dispose(); throw new Error('released before it was ready'); }
        entry.world = world;
        entry.status = 'ready';
        world.resize(width, height, dpr);
        onReady(index);
        return world;
      },
      (err) => {
        if (entries.get(index) === entry) entries.delete(index);
        onFail(index, err);
        throw err;
      },
    );
    entry.ready.catch(() => {}); // callers that care use whenReady()
  }

  function release(index) {
    const entry = entries.get(index);
    if (!entry) return;
    entries.delete(index);
    if (entry.world) { entry.world.dispose(); onRelease(index); }
  }

  function whenReady(index) {
    const entry = entries.get(index);
    return entry ? entry.ready : Promise.reject(new Error(`world ${index} was never requested`));
  }

  function guard(index, fn) {
    try { fn(); return true; } catch (err) { release(index); onFail(index, err); return false; }
  }

  function frame({ time, delta, state, pointer }) {
    if (lost) return;
    const a = entries.get(state.active);
    const b = state.next >= 0 && state.transition > 0 ? entries.get(state.next) : undefined;
    let A = a && a.status === 'ready' ? a.world : null;
    let B = b && b.status === 'ready' ? b.world : null;
    if (A && !guard(state.active, () => A.update({ time, delta, progress: state.progress, pointer, tier }))) A = null;
    if (B && !guard(state.next, () => B.update({ time, delta, progress: 0, pointer, tier }))) B = null;
    if (A && B) compositor.render(A, B, state.transition);
    else if (A) { renderer.setRenderTarget(null); renderer.render(A.scene, A.camera); }
    else if (B && state.transition > 0.5) { renderer.setRenderTarget(null); renderer.render(B.scene, B.camera); }
    else { renderer.setRenderTarget(null); renderer.clear(); }
  }

  return { tier, ensure, release, whenReady, frame, loaded: () => new Set(entries.keys()) };
}
```

- [ ] **Step 3: Implement the dormant grid world**

`src/worlds/dormant.js`:
```js
import * as THREE from 'three';

const COLS = { high: 160, mid: 110, low: 70 };

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uPointer;
uniform float uScale;
varying float vAlpha;
void main() {
  vec3 p = position;
  float glow = smoothstep(1.4, 0.0, distance(p.xy, uPointer));
  float breathe = 0.5 + 0.5 * sin(uTime * 0.7 - length(p.xy) * 0.8);
  p.z += glow * 0.3;
  vAlpha = 0.05 + 0.16 * breathe + 0.55 * glow;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.6 + 2.4 * glow) * uScale;
}`;

const fragmentShader = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  if (dot(d, d) > 0.25) discard;
  gl_FragColor = vec4(vec3(0.957, 0.957, 0.949) * vAlpha, 1.0);
}`;

export default {
  name: 'dormant',
  async create(stage) {
    const cols = COLS[stage.tier] || COLS.mid;
    const rows = Math.round(cols * 0.62);
    const positions = new Float32Array(cols * rows * 3);
    let k = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        positions[k++] = (x / (cols - 1) - 0.5) * 9;
        positions[k++] = (y / (rows - 1) - 0.5) * 5.6;
        positions[k++] = 0;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const uniforms = { uTime: { value: 0 }, uPointer: { value: new THREE.Vector2(99, 99) }, uScale: { value: 1 } };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090909');
    scene.add(points);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 0, 6);
    const target = new THREE.Vector2(99, 99);
    const halfH = Math.tan(THREE.MathUtils.degToRad(22.5)) * 6;

    return {
      scene,
      camera,
      update({ time, pointer }) {
        uniforms.uTime.value = time;
        target.set(pointer.x * halfH * camera.aspect, -pointer.y * halfH);
        uniforms.uPointer.value.lerp(target, 0.12);
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = dpr;
      },
      dispose() { geometry.dispose(); material.dispose(); },
    };
  },
};
```

- [ ] **Step 4: Replace `src/app.js` with the final version**

```js
import Lenis from 'lenis';
import { sceneState } from './lib/scroll.js';
import { lifecyclePlan } from './lib/lifecycle.js';
import { createMenu } from './ui/menu.js';
import { createPill } from './ui/pill.js';

export function readScenes(doc) {
  return Array.from(doc.querySelectorAll('.scene')).map((el) => ({
    el,
    id: el.dataset.sceneId,
    world: el.dataset.world,
    options: JSON.parse(el.dataset.worldOptions || '{}'),
  }));
}

function measure(scenes, win) {
  const y = win.scrollY;
  const vh = win.innerHeight;
  return scenes.map(({ el }) => {
    const track = el.querySelector('.scene__track') || el;
    return { start: el.getBoundingClientRect().top + y, length: Math.max(1, track.offsetHeight - vh) };
  });
}

async function renderStill(stage, scenes, id, params, html) {
  html.classList.add('still');
  const index = scenes.findIndex((s) => s.id === id);
  if (!stage || index < 0) { html.dataset.stillReady = 'error'; return; }
  stage.ensure(index, scenes[index].world, scenes[index].options);
  try { await stage.whenReady(index); } catch { html.dataset.stillReady = 'error'; return; }
  const state = { active: index, next: -1, progress: Number(params.get('p') ?? 0.8), transition: 0, display: index };
  for (let f = 0; f < 90; f++) stage.frame({ time: 6 + f / 30, delta: 1 / 30, state, pointer: { x: 0, y: 0 } });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  html.dataset.stillReady = '1';
}

export async function startApp({ win = window, doc = document } = {}) {
  const html = doc.documentElement;
  const params = new URLSearchParams(win.location.search);
  const still = params.get('still');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = readScenes(doc);

  // ---- 3D stage: skipped for reduced motion and ?posters. three.js loads here, after first paint.
  let stage = null;
  const failed = new Set();
  if (still || (!reduced && !params.has('posters'))) {
    try {
      const { createStage } = await import('./stage/stage.js');
      stage = createStage(doc.querySelector('canvas.stage'), {
        tierOverride: params.get('tier'),
        onReady: (i) => scenes[i].el.classList.add('is-live'),
        onRelease: (i) => scenes[i].el.classList.remove('is-live'),
        onFail: (i, err) => {
          failed.add(i);
          scenes[i].el.classList.remove('is-live');
          scenes[i].el.classList.add('is-failed');
          console.error(`[stage] the "${scenes[i].id}" world failed; showing its poster instead.`, err);
        },
        onContextLost: () => {
          stage = null;
          html.classList.remove('webgl');
          console.warn('[stage] WebGL context lost; showing posters.');
        },
      });
      html.classList.add('webgl');
    } catch (err) {
      stage = null;
      console.warn('[stage] WebGL is unavailable; showing posters.', err);
    }
  }

  if (still) { await renderStill(stage, scenes, still, params, html); return; }

  // ---- smooth scroll and in-page links
  const lenis = reduced ? null : new Lenis({ autoRaf: false });
  const goTo = (id) => {
    const target = doc.getElementById(id);
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, {
        duration: 1.4,
        // If anything above changed height mid-flight, finish exactly on the target.
        onComplete: () => { if (Math.abs(target.getBoundingClientRect().top) > 2) lenis.scrollTo(target, { immediate: true }); },
      });
    } else target.scrollIntoView({ block: 'start' });
    const heading = target.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  };
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('#chapter-menu')) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || !doc.getElementById(id)) return;
    e.preventDefault();
    goTo(id);
  });

  // ---- pill and menu
  const pill = createPill(doc.querySelector('.pill'), scenes);
  const menu = createMenu({
    menu: doc.getElementById('chapter-menu'),
    triggers: Array.from(doc.querySelectorAll('[aria-controls="chapter-menu"]')),
    onSelect: goTo,
  });

  let layout = measure(scenes, win);
  let state = sceneState(win.scrollY, win.innerHeight, layout);
  const updateUi = () => {
    state = sceneState(win.scrollY, win.innerHeight, layout);
    pill.update(state.display);
    menu.setCurrent(state.display - 1);
  };
  const remeasure = () => { layout = measure(scenes, win); updateUi(); };
  win.addEventListener('resize', remeasure);
  if ('ResizeObserver' in win) new win.ResizeObserver(remeasure).observe(doc.body);
  doc.fonts?.ready.then(remeasure);
  updateUi();

  const pointer = { x: 0, y: 0 };
  win.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / win.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / win.innerHeight) * 2 - 1;
  }, { passive: true });

  if (!stage && !lenis) { win.addEventListener('scroll', updateUi, { passive: true }); return; }

  // ---- one loop for scrolling, UI and the stage; pauses while the tab is hidden
  let raf = 0;
  let last = performance.now();
  const tick = (now) => {
    raf = win.requestAnimationFrame(tick);
    const delta = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (lenis) lenis.raf(now);
    updateUi();
    if (!stage) return;
    const plan = lifecyclePlan(state.active, stage.loaded(), scenes.length);
    plan.dispose.forEach((i) => stage.release(i));
    plan.load.forEach((i) => { if (!failed.has(i)) stage.ensure(i, scenes[i].world, scenes[i].options); });
    stage.frame({ time: now / 1000, delta, state, pointer });
  };
  raf = win.requestAnimationFrame(tick);
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) { win.cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = performance.now(); raf = win.requestAnimationFrame(tick); }
  });
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run tests/unit/registry.test.js`
Expected: PASS.

Run: `npx playwright test tests/e2e/stage.spec.js tests/e2e/navigation.spec.js`
Expected: all passed. The hero and chapters log "world failed" errors at this point because `index.js` and `picture.js` don't exist yet. That's expected, and these tests don't check for it.

- [ ] **Step 6: Commit**

```bash
git add src/stage src/worlds/registry.js src/worlds/dormant.js src/app.js tests/unit/registry.test.js tests/e2e/stage.spec.js
git commit -m "feat: add the WebGL stage, zoom-blur warp, poster fallbacks and dormant grid world" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The "picture to particles" world

**Files:**
- Create: `src/worlds/picture.js`
- Test: `tests/e2e/picture.spec.js`

**Interfaces:**
- Consumes: `samplePoints`, `mulberry32`, `particleCount`; the stage context `{ renderer, tier }`; options `{ cover: url (already base-resolved), palette?: string[], minLuma?: number, seed?: number, background?: string }`.
- Produces:
  - The default export `{ name: 'picture', create }`.
  - `loadImageData(url, maxSide = 240): Promise<ImageData>`.
  - It throws, which the stage turns into the poster fallback, when the cover fails to load or has no visible pixels.

- [ ] **Step 1: Write the failing browser test**

`tests/e2e/picture.spec.js`:
```js
import { test, expect } from '@playwright/test';
import { projects } from '../../src/content/projects.js';

const scrollToId = (page, id) => page.evaluate((el) => document.getElementById(el).scrollIntoView({ block: 'start' }), id);

test('every chapter world goes live', async ({ page }) => {
  await page.goto('./');
  for (const p of projects) {
    await scrollToId(page, p.id);
    await expect(page.locator(`#${p.id}`)).toHaveClass(/is-live/, { timeout: 30_000 });
  }
  // Only chapters: the hero's own world arrives in Task 12, so the hero still falls back to its poster here.
  await expect(page.locator('.chapter.is-failed')).toHaveCount(0);
});

test('a chapter whose cover fails falls back to its poster, and the others still work', async ({ page }) => {
  await page.route('**/projects/ascii-mirror/cover.webp', (route) => route.abort());
  await page.goto('./');
  await scrollToId(page, 'ascii-mirror');
  await expect(page.locator('#ascii-mirror')).toHaveClass(/is-failed/, { timeout: 30_000 });
  await expect.poll(() => page.locator('#ascii-mirror .scene__poster').evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  await scrollToId(page, 'pico-light-show');
  await expect(page.locator('#pico-light-show')).toHaveClass(/is-live/, { timeout: 30_000 });
});
```

Run: `npx playwright test tests/e2e/picture.spec.js`
Expected: FAIL. The chapters become `is-failed` because there is no world called "picture" yet.

- [ ] **Step 2: Implement `src/worlds/picture.js`**

```js
import * as THREE from 'three';
import { samplePoints } from '../lib/sample.js';
import { mulberry32 } from '../lib/rng.js';
import { particleCount } from '../lib/tier.js';

const vertexShader = /* glsl */ `
attribute vec3 aScatter;
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uAssemble;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float e = uAssemble * uAssemble * (3.0 - 2.0 * uAssemble);
  vec3 p = mix(aScatter, position, e);
  float t = uTime * 0.35 + aSeed * 6.2831;
  p += vec3(sin(t + p.y * 2.1), cos(t * 0.8 + p.x * 1.7), sin(t * 0.6 + p.x * 1.3 + p.y)) * (0.01 + 0.06 * (1.0 - e));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(24.0, 9.0 * uScale * (0.6 + aSeed * 0.8) / -mv.z);
  vColor = aColor;
  vAlpha = 0.5 + 0.5 * e;
}`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.25, 0.05, r));
}`;

export async function loadImageData(url, maxSide = 240) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  return g.getImageData(0, 0, w, h);
}

export default {
  name: 'picture',
  async create(stage, options = {}) {
    if (!options.cover) throw new Error('the picture world needs a cover image');
    const image = await loadImageData(options.cover);
    const rng = mulberry32(options.seed ?? 7);
    const count = particleCount(60000, stage.tier);
    const sampled = samplePoints(image, count, rng, { minLuma: options.minLuma ?? 0.08 });
    if (!sampled.count) throw new Error(`cover ${options.cover} has no visible pixels to turn into particles`);

    const palette = (options.palette || []).map((hex) => new THREE.Color(hex));
    const scatter = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      scatter[i * 3] = (rng() * 2 - 1) * 3.2;
      scatter[i * 3 + 1] = (rng() * 2 - 1) * 2.2;
      scatter[i * 3 + 2] = (rng() * 2 - 1) * 2.5;
      seeds[i] = rng();
      if (palette.length) {
        const c = palette[i % palette.length];
        sampled.colors[i * 3] = sampled.colors[i * 3] * 0.65 + c.r * 0.35;
        sampled.colors[i * 3 + 1] = sampled.colors[i * 3 + 1] * 0.65 + c.g * 0.35;
        sampled.colors[i * 3 + 2] = sampled.colors[i * 3 + 2] * 0.65 + c.b * 0.35;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(sampled.positions, 3));
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(sampled.colors, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const uniforms = { uTime: { value: 0 }, uAssemble: { value: 0 }, uScale: { value: 1 } };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    const group = new THREE.Group();
    group.add(points);
    group.position.y = 0.12;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(options.background || '#090909');
    scene.add(group);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.4);

    return {
      scene,
      camera,
      update({ time, progress, pointer }) {
        uniforms.uTime.value = time;
        uniforms.uAssemble.value = Math.min(1, progress / 0.6); // scattered at 0, settled by 0.6
        group.rotation.y += (pointer.x * 0.25 - group.rotation.y) * 0.05;
        group.rotation.x += (pointer.y * 0.12 - group.rotation.x) * 0.05;
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = dpr * (height / 900);
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const halfW = halfH * camera.aspect;
        group.scale.setScalar(Math.min(1, (halfW * 0.86) / sampled.extent.x, (halfH * 0.78) / sampled.extent.y));
      },
      dispose() { geometry.dispose(); material.dispose(); },
    };
  },
};
```

- [ ] **Step 3: Run the tests to see them pass**

Run: `npx playwright test tests/e2e/picture.spec.js tests/e2e/stage.spec.js`
Expected: all passed.

- [ ] **Step 4: Look at it**

Start the dev server with `preview_start` (name `portfolio-dev`), scroll to each chapter and take a screenshot. Check that:
- each cover scatters at the start of its chapter and settles into a recognisable picture as you scroll;
- the warp streaks between chapters;
- the titles stay readable over the particles.

If a picture is too dim against `#090909`, raise its `minLuma` or its palette mix in `projects.js` rather than changing the shader.

- [ ] **Step 5: Commit**

```bash
git add src/worlds/picture.js tests/e2e/picture.spec.js
git commit -m "feat: add the picture-to-particles world used by every chapter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The hero "Index" world with the 3D text ring

**Files:**
- Create: `src/worlds/lib/ring.js`, `src/worlds/index.js`
- Modify: `tests/unit/registry.test.js` (add the completeness test)
- Test: `tests/e2e/hero.spec.js`

**Interfaces:**
- Consumes: `mulberry32` and `particleCount`; the Hanken Grotesk 300 font face loaded by `main.js`.
- Produces:
  - `createTextRing({ text?, radius?, height?, font? }): Promise<{ mesh, material, dispose() }>`. It is an open, double-sided cylinder that reads left-to-right on the front and mirrored on the back.
  - The default export `{ name: 'index', create }`.

- [ ] **Step 1: Add the failing tests**

In `tests/unit/registry.test.js`, add:
```js
it('has a world file for every allowed name', () => {
  expect(Object.keys(worldLoaders).sort()).toEqual([...WORLD_NAMES].sort());
});
```

`tests/e2e/hero.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('the hero world goes live on load', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#top')).toHaveClass(/is-live/, { timeout: 30_000 });
  await expect(page.locator('#top')).not.toHaveClass(/is-failed/);
});
```

Run: `npx vitest run tests/unit/registry.test.js && npx playwright test tests/e2e/hero.spec.js`
Expected: FAIL. The registry is missing "index", and the hero becomes `is-failed`.

- [ ] **Step 2: Implement the ring and the world**

`src/worlds/lib/ring.js`:
```js
import * as THREE from 'three';

// Text painted around an open, double-sided cylinder: reads normally on the front, mirrored on the back.
export async function createTextRing({ text = 'BUILT WITH CLAUDE CODE · ', radius = 2.4, height = 0.5, font = '300 96px "Hanken Grotesk"' } = {}) {
  if (document.fonts) await document.fonts.load(font).catch(() => {});
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = Math.round(canvas.width / ((2 * Math.PI * radius) / height)); // keep letters unstretched
  const g = canvas.getContext('2d');
  g.font = font;
  const repeats = Math.max(1, Math.round(canvas.width / g.measureText(text).width));
  const line = text.repeat(repeats);
  const scaleX = canvas.width / g.measureText(line).width; // close the loop exactly
  g.setTransform(scaleX, 0, 0, 1, 0, 0);
  g.font = font;
  g.fillStyle = '#ffffff';
  g.textBaseline = 'middle';
  g.fillText(line, 0, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 160, 1, true);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = 0.16;
  return { mesh, material, dispose() { geometry.dispose(); material.dispose(); texture.dispose(); } };
}
```

`src/worlds/index.js`:
```js
import * as THREE from 'three';
import { mulberry32 } from '../lib/rng.js';
import { particleCount } from '../lib/tier.js';
import { createTextRing } from './lib/ring.js';

// One colour per chapter world: HALCYON ice/teal, ASCII green, Pico rainbow, DEAD TIRED red/bone.
const PALETTE = ['#e6f4f7', '#7fb8c4', '#39ff88', '#ff3b6b', '#ffb020', '#39d0ff', '#8c1f25', '#bca775'];

const vertexShader = /* glsl */ `
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uProgress;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float t = uTime * 0.18 + aSeed * 6.2831;
  p += vec3(sin(t + p.y * 0.9), cos(t * 0.7 + p.x * 0.6), sin(t * 0.5 + p.z)) * 0.18;
  p.z += uProgress * uProgress * (3.0 + aSeed * 7.0); // stream toward the camera on the way out
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(28.0, (2.0 + aSeed * 5.0) * uScale * (6.0 / -mv.z));
  vColor = aColor;
  vAlpha = 0.5 * smoothstep(0.2, 1.5, -mv.z);
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

function gauss(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export default {
  name: 'index',
  async create(stage) {
    const rng = mulberry32(2026);
    const count = particleCount(40000, stage.tier);
    const blobs = PALETTE.map((hex) => ({
      color: new THREE.Color(hex),
      center: new THREE.Vector3((rng() * 2 - 1) * 3.4, (rng() * 2 - 1) * 1.8, -rng() * 3),
      spread: 0.7 + rng() * 0.8,
    }));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const b = blobs[Math.floor(rng() * blobs.length)];
      positions[i * 3] = b.center.x + gauss(rng) * b.spread * 1.3;
      positions[i * 3 + 1] = b.center.y + gauss(rng) * b.spread * 0.8;
      positions[i * 3 + 2] = b.center.z + gauss(rng) * b.spread;
      const shade = 0.55 + rng() * 0.45;
      colors[i * 3] = b.color.r * shade;
      colors[i * 3 + 1] = b.color.g * shade;
      colors[i * 3 + 2] = b.color.b * shade;
      seeds[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const uniforms = { uTime: { value: 0 }, uProgress: { value: 0 }, uScale: { value: 1 } };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const cloud = new THREE.Points(geometry, material);
    cloud.frustumCulled = false;

    const ring = await createTextRing();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090909');
    scene.add(cloud, ring.mesh);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    return {
      scene,
      camera,
      update({ time, progress, pointer }) {
        uniforms.uTime.value = time;
        uniforms.uProgress.value = progress;
        ring.mesh.rotation.y = -(time * 0.22 + progress * 2.4); // text slides right-to-left like a marquee
        ring.mesh.position.z = progress * 2.5;
        ring.material.opacity = 1 - progress * 0.7;
        camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.04;
        camera.position.y += (-pointer.y * 0.2 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = dpr * (height / 900);
        ring.mesh.scale.setScalar(Math.max(0.55, Math.min(1, camera.aspect / 1.2)));
      },
      dispose() { geometry.dispose(); material.dispose(); ring.dispose(); },
    };
  },
};
```

- [ ] **Step 3: Run the tests to see them pass**

Run: `npx vitest run tests/unit/registry.test.js && npx playwright test tests/e2e/hero.spec.js tests/e2e/stage.spec.js`
Expected: all passed.

- [ ] **Step 4: Look at it**

Open the dev server at the top of the page and take two screenshots a few seconds apart. Check that:
- the ring reads "BUILT WITH CLAUDE CODE ·" left-to-right on the front;
- the back shows the text mirrored;
- the letters slide right-to-left;
- the coloured cloud drifts behind it.

If the front reads mirrored, set `texture.repeat.x = -1; texture.wrapS = THREE.RepeatWrapping;` in `ring.js` and look again.

- [ ] **Step 5: Commit**

```bash
git add src/worlds/lib/ring.js src/worlds/index.js tests/unit/registry.test.js tests/e2e/hero.spec.js
git commit -m "feat: add the hero world: drifting colour cloud and spinning 3D text ring" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Posters

**Files:**
- Create: `tools/posters.mjs`
- Generated and committed: `public/posters/{hero, halcyon-somatics, ascii-mirror, pico-light-show, dead-tired, next}.webp`
- Modify: `package.json` (add a script)
- Test: `tests/unit/posters.test.js`, `tests/e2e/posters.spec.js`

**Interfaces:**
- Consumes: still mode (`?still=<id>&p=<n>&tier=high` and `html[data-still-ready]`) from Task 10; `projects`; `BASE`.
- Produces: one WebP poster per scene. `npm run posters` builds the site, then renders every poster.

- [ ] **Step 1: Write the failing tests**

`tests/unit/posters.test.js`:
```js
import { it, expect } from 'vitest';
import fs from 'node:fs';
import { projects } from '../../src/content/projects.js';

it('has a poster for every scene (run `npm run posters` after adding a project)', () => {
  const missing = ['hero', ...projects.map((p) => p.id), 'next'].filter((id) => !fs.existsSync(`public/posters/${id}.webp`));
  expect(missing, 'run `npm run posters`').toEqual([]);
});
```

`tests/e2e/posters.spec.js`:
```js
import { test, expect } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('with reduced motion every scene shows its poster', async ({ page }) => {
  await page.goto('./');
  const ids = await page.locator('.scene').evaluateAll((els) => els.map((el) => el.id));
  for (const id of ids) {
    await page.evaluate((el) => document.getElementById(el).scrollIntoView(), id);
    const poster = page.locator(`#${id} .scene__poster`);
    await expect.poll(() => poster.evaluate((img) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
    expect(await poster.evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  }
});
```

Run: `npx vitest run tests/unit/posters.test.js`
Expected: FAIL, with "run `npm run posters`" and all 6 ids listed as missing.

- [ ] **Step 2: Implement `tools/posters.mjs` and the script**

```js
// Renders each scene's world full-screen in still mode and saves it as public/posters/<id>.webp.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { preview } from 'vite';
import { launch } from './lib/browser.mjs';
import { projects } from '../src/content/projects.js';
import { BASE } from '../site.config.js';

const PORT = 4174;
const scenes = [['hero', 0.15], ...projects.map((p) => [p.id, 0.85]), ['next', 0.5]];

await fs.mkdir('public/posters', { recursive: true });
const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' });
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('console', (m) => { if (m.type() === 'error') console.error(`[page] ${m.text()}`); });
  for (const [id, progress] of scenes) {
    await page.goto(`http://localhost:${PORT}${BASE}?still=${id}&p=${progress}&tier=high`);
    await page.waitForFunction(() => document.documentElement.dataset.stillReady, null, { timeout: 120_000 });
    const state = await page.evaluate(() => document.documentElement.dataset.stillReady);
    if (state !== '1') throw new Error(`poster for "${id}" failed to render (${state})`);
    const png = await page.locator('canvas.stage').screenshot();
    await sharp(png).webp({ quality: 80 }).toFile(`public/posters/${id}.webp`);
    console.log(`poster: public/posters/${id}.webp`);
  }
} finally {
  await browser.close();
  if (typeof server.close === 'function') await server.close();
  else server.httpServer.close();
}
```

In `package.json` `"scripts"`, add `"posters": "vite build && node tools/posters.mjs"`.

- [ ] **Step 3: Generate the posters and look at them**

Run: `npm run posters`
Expected: six `poster:` lines.

Open each poster with the Read tool and check that:
- the hero poster shows the text ring over the colour cloud;
- each chapter poster shows its settled picture;
- the next poster shows the faint grid.

Run: `npm run check:media`
Expected: "no EXIF, XMP or IPTC metadata".

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run tests/unit/posters.test.js && npx playwright test tests/e2e/posters.spec.js`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add tools/posters.mjs package.json public/posters tests/unit/posters.test.js tests/e2e/posters.spec.js
git commit -m "feat: render and commit a poster for every scene" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Whole-site checks and review screenshots

**Files:**
- Test: `tests/e2e/site.spec.js`, `tests/e2e/screens.spec.js`

**Interfaces:**
- Consumes: everything above.
- Produces: `screens/{desktop,mobile}-<id>.png` and `screens/{desktop,mobile}-<id>-panel.png`, which are gitignored and used for review.

- [ ] **Step 1: Write the whole-site tests**

`tests/e2e/site.spec.js`:
```js
import { test, expect } from '@playwright/test';

const LOCAL = new Set(['localhost', '127.0.0.1']);

test('scrolling the whole page logs no errors and calls no third parties', async ({ page }) => {
  const errors = [];
  const outside = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.protocol.startsWith('http') && !LOCAL.has(u.hostname)) outside.push(req.url());
  });
  await page.goto('./');
  await expect(page.locator('#top')).toHaveClass(/is-live/, { timeout: 30_000 });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(2000);
  await expect(page.locator('.scene.is-failed')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(outside).toEqual([]);
});

test('with the stage running, a 375px phone has no sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveClass(/webgl/);
  await page.locator('.topbar__projects').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
```

`tests/e2e/screens.spec.js`:
```js
import { test } from '@playwright/test';

const VIEWPORTS = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 375, height: 812 }];

for (const vp of VIEWPORTS) {
  test(`review screenshots (${vp.name})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('./');
    const ids = await page.locator('.scene').evaluateAll((els) => els.map((el) => el.id));
    for (const id of ids) {
      await page.evaluate((el) => {
        const scene = document.getElementById(el);
        const track = scene.querySelector('.scene__track');
        const top = scene.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + (track.offsetHeight - window.innerHeight) * 0.6);
      }, id);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `screens/${vp.name}-${id}.png` });
      const panel = page.locator(`#${id} .chapter__panel`);
      if (await panel.count()) {
        await panel.evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(800);
        await page.screenshot({ path: `screens/${vp.name}-${id}-panel.png` });
      }
    }
  });
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test && npm run test:e2e`
Expected: every unit and browser test passes. Fix any failure at its cause before moving on. A console error from a world is a real bug.

- [ ] **Step 3: Check the code budget**

Run:
```bash
npm run build && node -e "const fs=require('fs'),z=require('zlib');for(const f of fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js'))){console.log((z.gzipSync(fs.readFileSync('dist/assets/'+f)).length/1024).toFixed(1)+' KB  '+f)}"
```
Expected: the entry chunk (`index-*.js`) is under 250 KB gzipped. three.js and the worlds sit in separate chunks that load after first paint. If three.js ended up in the entry chunk, look for a static `import ... from 'three'` reachable from `src/app.js` and turn it into the dynamic `import('./stage/stage.js')` path.

- [ ] **Step 4: Review the screenshots**

Open every file in `screens/` with the Read tool and check that:
- every title is readable, including over the busiest worlds (the bottom scrim should keep contrast);
- nothing overlaps the pill;
- the cards line up;
- the phone layout has no clipped text;
- the DEAD TIRED and HALCYON titles use their display fonts.

Fix the CSS for anything wrong, then rerun Step 2.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/site.spec.js tests/e2e/screens.spec.js src
git commit -m "test: add whole-site error, privacy and review-screenshot checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Deploy workflow and CLAUDE.md

**Files:**
- Create: `.github/workflows/deploy.yml`, `CLAUDE.md`

**Interfaces:**
- Produces: a GitHub Pages workflow (it runs only once the repo is pushed, in milestone 6) and the working notes for future sessions.

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
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
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write `CLAUDE.md`**

````markdown
# Portfolio: notes for Claude Code

Oscar's public portfolio of projects built with Claude Code. It goes live at https://itsoscar-69.github.io/ once published.

## Rules (this repo is public)

- Show the first name "Oscar" only. Never add a surname, school, state, assignment name or email address to any file or commit message. `tests/unit/privacy.test.js` checks this locally against `privacy.local.json` (gitignored).
- Commits use the existing GitHub noreply identity. Don't change git config.
- The built site makes no requests to third parties: no Google Fonts, CDNs, analytics or trackers. Fonts come from @fontsource.
- Don't push or publish without Oscar's go-ahead.
- Write project copy in Oscar's voice: first person, short and plain, and honest about what Oscar did and what Claude did.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server at http://localhost:5173 (restarts when `src/content/projects.js` changes) |
| `npm run check` | Checks `src/content/projects.js` and that every file it names exists |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright with Microsoft Edge; use `PW_CHANNEL=chromium` after `npx playwright install chromium` for Playwright's own browser) |
| `npm run media` | Rebuilds the HALCYON live copy, covers, screenshots and WebP images from the raw sources (needs `sources.local.json`) |
| `npm run posters` | Builds the site and re-renders the still poster for every scene into `public/posters/` |
| `npm run build` | Production build into `dist/` |

## Adding a project

1. Copy the TEMPLATE comment at the top of `src/content/projects.js` into the list and fill it in.
2. Put its files in `public/projects/<id>/`:
   - a `cover.webp` for the "picture" world;
   - images as WebP, 1800 px wide, plus an optional 900 px `-900.webp` version;
   - any videos or code files.

   Strip image metadata: run `npm run check:media` to check.
3. Run `npm run check`, then `npm run posters`, then `npm test`.
4. Run `npm run dev` and look at it with Oscar before committing.

The chapter menu, hero links and project count update automatically.

## How it fits together

- `src/content/`: the project list, its validation (`validate.js`) and the HTML renderer (`render.js`).
- `plugins/chapters.js`: a Vite plugin that validates the list and renders it into `index.html` at build time.
- `src/app.js`: reads the scenes from the page and runs scrolling (Lenis), the pill and menu, the 3D stage and still mode (`?still=<id>`).
- `src/stage/`: the one WebGL renderer, world loading and disposal, and the zoom-blur transition.
- `src/worlds/<name>.js`: one 3D world per file. Helpers go in `src/worlds/lib/`. Add a new world's name to `src/worlds/names.js`.
- `src/lib/`: pure functions with unit tests.
- `public/halcyon/`: the live HALCYON copy, generated by `tools/halcyon.mjs`.
- `site.config.js`: `BASE`, the URL path the site is served from.

World interface:

```js
export default {
  name: 'my-world',
  async create(stage, options) { // stage = { renderer, tier: 'high' | 'mid' | 'low' }
    return { scene, camera, update({ time, delta, progress, pointer, tier }) {}, resize(width, height, dpr) {}, dispose() {} };
  },
};
```

If `create` throws, or `update` throws, that chapter falls back to its poster and the rest of the page carries on.

## Status

Milestone 1 (shell) is in place. Every chapter uses the "picture" world for now. Custom worlds come in later milestones: HALCYON (2), DEAD TIRED (3), Pico Light Show (4) and ASCII Mirror (5). Launch is milestone 6. Plans live in `docs/superpowers/plans/`.
````

- [ ] **Step 3: Check the privacy guard and commit**

Run: `npx vitest run tests/unit/privacy.test.js`
Expected: PASS.

```bash
git add .github CLAUDE.md
git commit -m "docs: add CLAUDE.md and the GitHub Pages deploy workflow" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Milestone review with Oscar

**Files:** none, unless the review asks for fixes.

- [ ] **Step 1: Run everything from a clean build**

Run: `npm test && npm run test:e2e && npm run check && npm run check:media`
Expected: all green.

- [ ] **Step 2: Show Oscar the local preview**

1. Start the dev server with `preview_start` (name `portfolio-dev`).
2. Scroll from the hero to the footer, taking screenshots of the hero, one warp mid-transition, each chapter intro and panel, and the next slot.
3. Click "Visit the live page" in the HALCYON chapter and check that the HALCYON page opens, not the portfolio again. This exercises `publicIndexRewrite` on the dev server.
4. Send the best four screenshots to Oscar with `SendUserFile`.
5. Ask him to try it himself in the preview pane.

- [ ] **Step 3: Collect sign-off**

Ask Oscar:
- whether the shell looks right;
- whether any copy should change;
- whether anything feels slow.

Make the small fixes he asks for (copy edits in `projects.js`, spacing in CSS), rerun Step 1 and commit each fix. Milestone 1 is done when Oscar says it looks right. Note that in the final summary, along with anything he deferred to later milestones.
