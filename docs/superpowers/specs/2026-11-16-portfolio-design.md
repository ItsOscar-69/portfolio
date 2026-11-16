# Portfolio: "Built with Claude Code" — Design

**Date:** 2026-11-16
**Status:** Awaiting review
**Repo:** this folder (`portfolio`). It will be pushed to a **public** GitHub repo, so this file is public too.

## 1. Intent

A public portfolio website for Oscar that shows off the projects he has built with Claude Code, with plenty of room for more. It takes its inspiration from Shopify Editions Spring '26: a live 3D particle scene behind the whole page, huge light type, one chapter per topic, a warp-style transition between chapters and a floating chapter pill. Visuals come first.

**What Oscar decided**

- A public website on GitHub Pages, from the GitHub account `ItsOscar-69`.
- It launches with four projects: HALCYON SOMATICS, ASCII Mirror, Pico Light Show and DEAD TIRED. InstaTrack, God's Eye View and tool installs are left out.
- Style direction "C · Chapter Worlds": a neutral black base where every project gets its own particle world, made from the project itself.
- The only name shown is the first name, "Oscar". No surname, school, location or email appears anywhere: on the site, in the repo or in commit metadata.
- There are no photos of the physical builds yet. The site launches with 3D renders and visuals made in code, and has slots so real photos and video can be added later.
- Build approach: Vite + plain three.js.
- Page flow, worlds, content model, architecture and hosting were each approved in conversation on 2026-11-16.

**Assumptions, made by Claude and open to correction**

- All copy is drafted by Claude from past session histories. Oscar edits and approves it before the first publish.
- English only. Desktop first, but phones get a fully working, good-looking experience.
- The site title is "Oscar — Built with Claude Code".

**Success looks like**

1. Someone scrolling it on a laptop or a phone reacts with "whoa". Oscar signs off on every world by eye.
2. Adding project #5 means one list entry and one folder of media, and can be done in under 15 minutes.
3. The page text is readable in under 2 seconds on an average phone, and the page never breaks, even when 3D is unavailable.

## 2. Inspiration, not reproduction

From Shopify Editions we take the **structure**: one fixed WebGL canvas, scenes per chapter, the text ring in the hero, the zoom-blur warp between chapters, big light headings, dark content panels with media cards, and a floating pill with a chapter menu. We do **not** reuse Shopify's fonts (National2, Inter), its imagery, its forest/"Everywhere" composition or its copy. For reference, their stack is React Three Fiber, Theatre.js, Lenis and KTX2. Ours is lighter on purpose.

## 3. Page structure

One long scroll, top to bottom:

1. **Top bar** (always visible, minimal): wordmark "Oscar", a "Projects ▾" menu that lists the chapters, and a right-hand pill linking to `github.com/ItsOscar-69`.
2. **Hero.** The "Index" world (§4.1) with a 3D text ring reading "BUILT WITH CLAUDE CODE · ", which spins with time and scroll and shows mirrored on its back face. Bottom left: "N projects built with Claude Code, and counting" (N comes from the content list). Bottom right: a link grid with one link per chapter.
3. **Chapters**, one per project and in list order. Each chapter has:
   - **Warp in**: the previous world zoom-blurs into this one.
   - **Intro** (sticky, about 200vh of scroll): the world fills the screen and reacts to scroll progress and the pointer. It shows the chapter number, date and tags in mono, the title in the project's display font, a one-line hook and a status badge if the project isn't finished.
   - **Content panel**: a solid `#090909` panel scrolls up over the world. It contains a headline plus a short write-up and links, a large media block, and three cards: *The idea*, *How it was built*, *Inside*.
4. **Chapter pill** (floating, bottom centre, hidden over the hero): shows "NN · Title" for the current chapter. Clicking or tapping it opens a menu of every chapter, plus a faded "NN · Coming soon" entry, and jumps to the chosen chapter. It is generated from the content list.
5. **Next slot**: the "Dormant grid" world behind "Project NN is loading…", a short about line ("I'm Oscar. I make things with Claude Code: websites, hardware, design."), then the footer (name, GitHub, back to top).

## 4. Worlds

Every world is driven by three inputs: time, the chapter's scroll progress (0–1) and the pointer. Only one world runs at a time. The next world is lazy-loaded as its chapter approaches, and a world is disposed once it is two chapters away.

### 4.1 Index (hero)

About 40k particles, fewer on lower device tiers, in a drifting volumetric cloud tinted with all four chapters' palettes: ice white/teal, ASCII green, LED rainbow and blood red/bone. The text ring is a canvas-rendered texture on an open, double-sided cylinder. As you scroll out of the hero, the particles stream towards the camera into the first warp.

### 4.2 HALCYON SOMATICS: "chrome body"

Particles are sampled from the paths of HALCYON's own `assets/body-wireframe.svg` and extruded slightly into depth. They are ice white (`#e6f4f7`) on deep teal (`#0b1a1f`). At progress 0 they are scattered, and they settle into the body wireframe by progress 0.6. Real screenshots of the HALCYON page float past as glass panels with a soft blur. The display font is Michroma. The content panel links to the live copy at `/halcyon/` (§8.3).

### 4.3 ASCII Mirror: "live ASCII" (status: in progress)

The Pi 5 assembly model is rendered through an ASCII post-processing pass: brightness is mapped to the character ramp ` .:-=+*#%@` in green `#39ff88` on `#020604`. The model has 7 named parts: case, Pi 5, HAT spacers/header, AI HAT+, Camera Module 3, ribbon and camera mount. Scrolling explodes the assembly along its stacking axis, and the **camera mount (the printed part) is highlighted**.

- **"Try the mirror"** button: an opt-in webcam (`getUserMedia`) feeds the same ASCII pass so visitors see themselves as ASCII art. It only starts on a click, a visible "Camera on" indicator with a Stop button is shown, frames never leave the browser and nothing is stored. If camera permission is denied, a clear message appears and the model stays on screen.
- **Content panel**: a normal-shaded 3D viewer of the model (orbit controls, with a per-part list that highlights the part you hover), plus a capture of the Windows demo (`ascii_cyberpunk.py`).
- **Copy**: the hardware is built and the mount is printed. The Pi-side software (person segmentation on the AI HAT+, HDMI and LAN web view) is the next step. The status badge reads "In progress".

### 4.4 Pico Light Show: "the real effects"

A 3D strip of 20 glowing LEDs (instanced spheres plus bloom) laid out on a gentle curve. It runs a faithful JavaScript port of `MicroPico/boot.py`: the `power_up` intro, then `rainbow_glitter`, `twin_comets`, `fire`, `starfield`, `plasma` and `heartbeat`. Each effect plays for 15 s at 50 fps, with the 50-frame crossfade, the same `hsv`, `fade_all`, `add` and `draw_dot` maths, and the gamma/brightness table. Randomness uses a seeded RNG so tests are deterministic.

- Visitors can pick an effect from a small row of chips. Autoplay cycles the effects as the Pico does.
- **Content panel**: the MicroPython source for the current effect, with the line that is currently running highlighted, synced to the animation.

### 4.5 DEAD TIRED: "exploded print"

The 9 layer PNGs from the design are textured planes spread out along Z: shirt, title outlines (DEAD, TIRED), solid titles (DEAD, TIRED), ground, skeleton, bottom bar and battery cell. As progress goes from 0 to 0.7 they compress into the finished print, and the pointer tilts the stack. Bone (`#bca775`) and red (`#8c1f25`) ink-dust particles drift on a `#161616` background. The display font is Big Shoulders Display.

- **Content panel**: the tee mockup, the design on a black shirt and the alternative "with stump" version.
- **Credit, stated plainly**: Oscar prepared the skeleton (from a public-domain Vesalius 1543 plate, Fig. 165) and chose the layout direction. Claude helped with the style kit and assets, and composed the final layout at Oscar's request.

### 4.6 Fallback: "picture to particles"

This world is for any future project without a custom world. It samples an image (`cover`) into a particle cloud: colour comes from the pixels, depth from luminance, plus gentle curl-noise drift. A palette override is optional. On scroll, the particles assemble from scatter into the picture.

### 4.7 Dormant grid (next slot)

A faint, slowly breathing grid of points that brightens around the pointer.

## 5. Content model

`src/content/projects.js` exports an ordered array. The array order is the chapter order.

```js
{
  id: 'pico-light-show',            // required, kebab-case, unique; media folder name
  title: 'Pico Light Show',         // required
  hook: 'Seven LED effects…',       // required, one line
  date: '2026-09',                  // required, YYYY-MM
  status: 'done',                   // required: 'done' | 'in-progress'
  tags: ['MicroPython', 'Pico'],    // required, 1–5 items
  world: 'pico',                    // required: a registered world name, or 'picture'
  worldOptions: { cover: 'cover.webp', palette: ['#…'] }, // optional, world-specific
  font: 'big-shoulders',            // optional display font key
  headline: 'Light, on a loop.',    // required
  summary: '…',                     // required (writing guide: 40–90 words; not enforced)
  cards: { idea: '…', built: '…', inside: '…' }, // required (guide: 15–50 words each)
  media: [                          // required, at least 1 item
    { type: 'image' | 'video' | 'model' | 'code' | 'link', src: '…', caption: '…', alt: '…' }
  ],
  links: [{ label: 'Visit the live page', href: '/halcyon/' }] // optional
}
```

The media for each project lives in `public/projects/<id>/`. Media `src` paths are relative to that folder. Link `href` values that start with `/` are resolved against Vite's `base` (§10), so they keep working if the site moves under a sub-path.

**Build check** (`src/content/validate.js`): runs before every dev start and build, and fails with a clear message when a required field is missing or the wrong type, an `id` is duplicated, a `world` is unregistered, or a referenced media file doesn't exist.

**Adding a project**

1. Copy the template entry in `projects.js` and fill it in.
2. Add a cover image and any media to `public/projects/<id>/`.
3. Run `npm run dev` to check it, then commit and push. GitHub Actions publishes the change.

The chapter menu, the hero links and the project count all update from the list. `CLAUDE.md` in the repo explains these steps so a future Claude Code session can carry them out.

## 6. Architecture

Vite (multi-page: `/` and `/halcyon/`), plain three.js, GSAP + ScrollTrigger, and Lenis. Each unit has one job and a small interface.

| Unit | Path | Job | Depends on |
|---|---|---|---|
| Content | `src/content/` | project list + validation | nothing |
| Page render | `vite-plugin-chapters.js` | at build time, renders chapter HTML from the list into `index.html`, so all text is real HTML before any JS runs | content |
| Stage | `src/stage/` | the one renderer, camera, render loop, device tier, bloom, warp transition pass, context-loss handling | three |
| Worlds | `src/worlds/*.js` + `index.js` registry | one scene each, behind a shared interface | stage helpers, lib |
| Scroll | `src/scroll/` | turns scroll into `{ chapterIndex, progress, transition }` and passes it to the stage | GSAP, Lenis, lib |
| UI | `src/ui/` | top bar, pill and menu, media blocks (video, model viewer, code panel, webcam mirror) | DOM, stage |
| Lib | `src/lib/` | pure functions: LED effect port, seeded RNG, palettes, SVG/image point sampling, scroll maths | nothing |

**World interface**

```js
// src/worlds/<name>.js
export default {
  name: 'pico',
  async create(stage, options) {          // load assets, build the scene
    return {
      scene, camera,                      // what the stage renders
      update({ time, delta, progress, pointer, tier }) {},
      resize(width, height, dpr) {},
      dispose() {},                       // free GPU memory
    };
  },
};
```

**Transitions.** While `transition` is between 0 and 1, the stage renders the outgoing and incoming worlds to render targets and blends them in a full-screen pass, with a radial zoom-blur that peaks at 0.5. With reduced motion, the zoom-blur is replaced by a short crossfade.

**Loading order.** The HTML and CSS, the self-hosted fonts and the poster images are painted first. three.js and the world code load after first paint, using dynamic import.

## 7. Assets and media pipeline

- **Fonts**, all self-hosted with `@fontsource`. The portfolio makes no requests to Google or any other third party.
  - Hanken Grotesk (200–400) for headings and body text.
  - JetBrains Mono for labels and code.
  - Michroma for HALCYON.
  - Big Shoulders Display for DEAD TIRED.
- **Pi model**: `baseline_assembly.glb` (6.2 MB) is compressed with `gltf-transform` (meshopt, with geometry quantised) to a target of 1.5 MB or less. Part names are preserved.
- **Images**: converted to WebP at two widths (about 900 px and 1800 px) by a `sharp` script that also strips all metadata (EXIF, XMP).
- **HALCYON screenshots and screen video**: captured automatically with Playwright from a local copy. The video is H.264 MP4 with a poster image, and plays muted on a loop only while on screen.
- **Posters**: `npm run posters` renders each world to a still image with Playwright. The output is committed to `public/posters/`. Posters are not generated in CI.
- **Kept out of the repo**: the layered PSD, the full-size print file, the STEP/SCAD sources and anything containing a surname, school, state or assignment name. Source files are copied in from their current folders once, during implementation. The Pi files currently sit in an app scratch workspace, so they are copied early.

## 8. Quality bars

### 8.1 Performance

- Text visible within 2 s on a mid-range phone over 4G.
- Initial JS under 250 KB gzipped, excluding three.js and world code, which load after first paint.
- 60 fps on a typical laptop and at least 30 fps on a mid-range phone.
- Three device tiers (high, mid, low), chosen from GPU renderer info, `hardwareConcurrency` and screen size. Tiers scale particle counts and DPR (capped at 2, or 1.5 on mid). The low tier also disables bloom.
- Rendering pauses when the tab is hidden.

### 8.2 Fallbacks and errors

- **No WebGL, or context lost:** every chapter shows its poster image behind the text. The page stays fully usable.
- **A world throws or its assets fail to load:** that chapter falls back to its poster, the error is logged to the console and the other chapters carry on.
- **`prefers-reduced-motion`:** posters are shown instead of continuous animation, crossfades replace the warp and smooth scrolling is turned off. Interactive demos (the light show, the mirror) only run when the visitor presses play.
- **Webcam:** opt-in only, with clear denied and unavailable messages.

### 8.3 Accessibility and privacy

- All text is real HTML in reading order, and canvases are `aria-hidden`.
- The pill menu is keyboard operable (Enter or Space opens it, Escape closes it, focus is trapped while it is open and returned on close). Focus styles are visible.
- Every image and video has alt text or a caption.
- Text contrast meets WCAG AA on its background, including text over posters (a scrim is used where needed).
- **HALCYON copy at `/halcyon/`:** its Google Fonts are replaced with self-hosted IBM Plex Mono, Michroma and a Japanese-subset Noto Sans JP. The consultation form's `action` and its fields' `name` attributes are removed, so even with JS off a submit can't put typed text into a URL. `autocomplete` is set to `off`, and the existing JS handler (which already calls `preventDefault`) keeps the on-page "uplink ticket" effect. It has no backend and none is added.
- No analytics, cookies or trackers.
- The repo's commits use the existing GitHub noreply identity.

## 9. Testing and acceptance

**Automated (`npm test`)**

- **Vitest unit tests**:
  - The LED port matches `boot.py` behaviour: effect order, 15 s timing at 50 fps, crossfade length, `twin_comets` bouncing and sparks on crossing, gamma table values, and `hsv` against reference values.
  - The build check rejects each kind of bad entry.
  - The scroll maths gives the right chapter index, progress and transition at boundaries.
  - Point sampling returns the requested count within bounds.
- **Playwright tests** against `vite preview` of the production build, served under the real base path:
  - It loads with no console errors.
  - Every list entry renders a chapter.
  - The pill menu jumps to each chapter, and the keyboard path works.
  - `/halcyon/` loads, with no requests to third-party hosts from either page.
  - The reduced-motion and no-WebGL paths show posters.
  - A 375 px viewport has no horizontal overflow.
  - Screenshots are saved at 1440×900 and 375×812 for review.

**By eye (required, not optional)**

- After each world is built, Oscar reviews it in the browser and signs it off, or asks for changes.
- Before the first publish, Oscar checks the site on a real phone, either over the local network or on a preview.

## 10. Hosting and deploy

- **GitHub repo** `ItsOscar-69/ItsOscar-69.github.io`, public, created by Oscar. The site is served at the root, `https://itsoscar-69.github.io/`, and Vite's `base` is `/`. If Oscar would rather use a differently named repo, `base` becomes `/<repo>/`. That is a single setting, and the Playwright tests use it.
- **Deploy**: a GitHub Actions workflow builds and publishes to Pages on every push to `main`.
- **Free Pages on a public repo means everything here is public**, including this spec, the plan and `CLAUDE.md`. They must not contain a surname, school, state, assignment name or email.
- **First publish is gated**: nothing is pushed to GitHub until Oscar has approved all copy and media.
- **Node**: the machine has Node 18.16.0. At plan time, check each tool's `engines` range and pin versions that work with it. If a required tool needs a newer Node, Oscar installs Node 22 LTS before setup.

## 11. Milestones

1. **Shell.**
   - Scaffold the project with the content list, build check, build-time HTML, stage, scroll, warp, top bar, pill and menu.
   - Build the hero with the Index world and the text ring, the fallback world for all four chapters, the next slot and the footer.
   - Add the HALCYON copy at `/halcyon/`, the posters, the tests, the Pages workflow and `CLAUDE.md`.
   - Ends with Oscar's review of a local preview.
2. **HALCYON world** (chrome body) and its media, then sign-off.
3. **DEAD TIRED world** (exploded print) and its media, then sign-off.
4. **Pico Light Show world** (LED port, effect chips, code panel), then sign-off.
5. **ASCII Mirror world** (ASCII pass, exploded model, webcam mirror, model viewer), then sign-off.
6. **Launch.** Copy review, the real-phone check, a final pass on the performance and accessibility bars, then the first publish once Oscar approves.

Each milestone leaves the site working and deployable, because chapters without a finished custom world use the fallback.

**Planning scope:** the first implementation plan covers milestone 1 in full. Milestones 2–6 each get their own short plan when they start, so every plan can be reviewed in one sitting and builds on what milestone 1 actually produced.

## 12. Out of scope

- A CMS or admin page. Projects are added by editing the list.
- Per-project detail pages. Everything lives in the long scroll. This can be revisited past about 8 projects.
- A contact form, email or social links other than GitHub.
- Building the ASCII Mirror's Pi software. The portfolio only describes it.
- Analytics.
- Light mode. The site is dark by design.
