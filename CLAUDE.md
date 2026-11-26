# Portfolio: notes for Claude Code

Oscar's public portfolio of projects built with Claude Code. The code is public at https://github.com/ItsOscar-69/portfolio. The site itself isn't hosted yet (see Publishing).

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
| `npm run media` | Rebuilds the HALCYON live copy, covers, screenshots and WebP images from the raw sources, then the DEAD TIRED layers and the Pi model (`publish-model`), and finishes with the media check (needs `sources.local.json`) |
| `npm run video:halcyon` | Runs `vite build`, then records the HALCYON page's start-up sequence and the HALCYON world frame by frame, and joins them into `screen.mp4` (H.264, no metadata or audio) plus a WebP poster. The first time on a machine, run `npx playwright install ffmpeg` (Playwright's recorder needs its own ffmpeg build). |
| `npm run layers:dead-tired` | Re-crops the DEAD TIRED layer PNGs from `raw/tee/layers/` into `public/projects/dead-tired/layers/` plus its `layers.json` manifest |
| `npm run led:reference` | Runs the real Pico `boot.py` under Python 3 and rewrites `tests/fixtures/boot-reference.json`, which the LED-port tests compare against (only needed if `boot.py` changes) |
| `npm run model:pi` | Compresses `raw/pi/baseline_assembly.glb` into `public/projects/ascii-mirror/pi-assembly.glb` (meshopt, quantised, all 7 named parts) |
| `npm run poster:model` | Builds the site and saves the ASCII Mirror's 3D viewer as its `model-poster.webp` |
| `npm run video:ascii` | Records the Windows ASCII demo headless (copy it to `raw/ascii/ascii_cyberpunk.py` first; needs `py` with pygame-ce and numpy) into `demo.mp4` and `demo-poster.webp` |
| `npm run to-webp -- <input> <output.webp>` | Converts one image to a 1800 px WebP plus a `-900.webp` copy, with metadata stripped |
| `npm run posters` | Builds the site and re-renders the still poster for every scene into `public/posters/` |
| `npm run check:history` | Run before every push. It checks every commit, ref, tag and file name, including binary files, for the words in `privacy.local.json`, and every past image for metadata |
| `npm run preview:phone` | Builds and serves the site on the local network, so a phone on the same Wi-Fi can open the Network URL it prints. The camera mirror needs https, so it says it is unavailable there |
| `npm run build` | Production build into `dist/` |

## Adding a project

1. Copy the TEMPLATE comment at the top of `src/content/projects.js` into the list and fill it in.
2. Put its files in `public/projects/<id>/`:
   - a `cover.webp` for the "picture" world;
   - images as WebP, 1800 px wide, plus an optional 900 px `-900.webp` version;
   - any videos or code files.

   Make images with `npm run to-webp -- <input> public/projects/<id>/<name>.webp`, which strips metadata. `npm test` fails if any published image still carries metadata (`npm run check:media` runs the same check).
3. Run `npm run check`, then `npm run posters`, then `npm test`.
4. Run `npm run dev` and look at it with Oscar before committing.

The chapter menu, hero links and project count update automatically.

## How it fits together

- `src/content/`: the project list, its validation (`validate.js`) and the HTML renderer (`render.js`).
- `plugins/chapters.js`: a Vite plugin that validates the list and renders it into `index.html` at build time.
- `src/app.js`: reads the scenes from the page and runs scrolling (Lenis), the pill and menu, the 3D stage and still mode (`?still=<id>`).
- `src/stage/`: the one WebGL renderer, world loading and disposal, and the zoom-blur transition.
- `src/worlds/<name>.js`: one 3D world per file. Helpers go in `src/worlds/lib/`. Add a new world's name to `WORLD_NAMES` in `src/worlds/names.js`, and the files it needs in `worldOptions` to `WORLD_ASSETS` there.
- `src/lib/`: pure functions with unit tests. `src/lib/led/` is a port of the Pico's `boot.py` that matches it frame for frame (boot.py run under CPython with the same seeded random stream; see `npm run led:reference`): its maths, effects, light-show timeline and a player. The `pico` world and `src/ui/light-show.js` share one player. `src/lib/camera.js` also holds the one shared `mirror` slot: the mirror UI puts its `<video>` there, and the ascii world reads it.
- `public/halcyon/`: the live HALCYON copy, generated by `tools/halcyon.mjs`.
- `site.config.js`: `BASE`, the URL path the site is served from.

`?fps` on any page shows a frame-rate readout with the device tier.

World interface:

```js
export default {
  name: 'my-world',
  async create(stage, options) { // stage = { renderer, tier: 'high' | 'mid' | 'low' }
    return { scene, camera, ready /* optional */, bloom /* optional */, update({ time, delta, progress, pointer, tier }) {}, resize(width, height, dpr) {}, dispose() {} };
  },
};
```

If `create` throws, or `update` throws, that chapter falls back to its poster and the rest of the page carries on.

`ready` is optional: a promise that settles (and never rejects) once background extras such as HALCYON's panels have loaded. Still mode waits for it, so posters include them.

`bloom` is optional too: `{ strength, radius, threshold }` asks the stage to bloom that world's frame, which it does on the high and mid tiers and never on low.

## Publishing

- Every push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, `npm run check`, `npm run check:media`, `npm test`, `npm run build`. Its GitHub Pages deploy job runs only when the workflow is started by hand (Actions → Run workflow), so a push never publishes a site. The actions are pinned to commit SHAs; update them on purpose, with the tag in the comment.
- Before deploying by hand: set the repo's Settings → Pages → Source to "GitHub Actions", and set `BASE` in `site.config.js` to `'/portfolio/'`, because this repo's site would be served at https://itsoscar-69.github.io/portfolio/.
- Before any push, run `npm run check:history`. A push publishes every past commit, not just the current files.
- Check the live site with `PW_BASE_URL=https://itsoscar-69.github.io/ npx playwright test tests/e2e/site.spec.js tests/e2e/halcyon.spec.js`.

## Status

Milestones 1 to 5 are in place: the shell and the HALCYON, DEAD TIRED, Pico Light Show and ASCII Mirror worlds. HALCYON uses its own "halcyon" world; DEAD TIRED uses the reusable "layers" world (a design's layers, from a layers.json manifest, float apart and slide together); Pico Light Show uses the "pico" world (a 20-LED strip running the boot.py port, with bloom), with effect chips and a live code panel from src/ui/light-show.js; ASCII Mirror uses the "ascii" world (the Pi build as green ASCII that explodes on scroll), with the opt-in webcam mirror from src/ui/mirror.js and a 3D model viewer in its panel from src/ui/model-viewer.js. No chapter uses the "picture" world now; it stays as the fallback for new projects. The hero uses "index" and the next slot uses "dormant". Launch is milestone 6. Plans live in `docs/superpowers/plans/`.
