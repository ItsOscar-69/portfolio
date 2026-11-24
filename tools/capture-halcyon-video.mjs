// Remakes the HALCYON chapter's video (npm run video:halcyon builds the site first).
//   Part 1: the live HALCYON page's start-up (boot sequence), recorded in real time, with the recorder's grey lead-in trimmed.
//   Part 2: the chapter's 3D body from the built site (?tier=high), captured frame by frame under Playwright's fake clock
//           so it is smooth even though software rendering is slow.
// ffmpeg joins them with a 0.6 s crossfade and fades out to black at the end, then writes an H.264 MP4 without
// metadata, encoder note or audio, plus a WebP poster (frame 90 of Part 2).
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { launch } from './lib/browser.mjs';
import { serveDir } from './lib/static-server.mjs';

const run = promisify(execFile);
const OUT = 'public/projects/halcyon-somatics';
const TMP = 'raw/video';
const FRAMES = `${TMP}/frames`;
const FPS = 30;
const FRAME_COUNT = 180;
const FADE = 0.6;
const SCROLL = 0.85; // fraction of the intro scroll: the body has settled by 0.6 (0.45 is still a scattered cloud)
const VP = { width: 1280, height: 800 };

await fs.rm(FRAMES, { recursive: true, force: true });
await fs.rm(`${TMP}/boot`, { recursive: true, force: true });
await fs.mkdir(FRAMES, { recursive: true });
const server = await serveDir('dist');
const browser = await launch();
let recording;
let cut;
try {
  // Part 1: the start-up, in real time.
  {
    const context = await browser.newContext({ viewport: VP, recordVideo: { dir: `${TMP}/boot`, size: VP } });
    const page = await context.newPage();
    const t0 = Date.now();
    await page.goto(`${server.url}/halcyon/`, { waitUntil: 'domcontentloaded' }); // fresh session, so the boot plays
    await page.waitForFunction(() => !document.documentElement.classList.contains('booting'), null, { timeout: 60_000 });
    const t1 = Date.now();
    await page.waitForTimeout(1500);
    cut = (t1 - t0) / 1000 + 1.5;
    recording = await page.video().path();
    await context.close();
  }

  // Part 2: the 3D body, frame by frame.
  {
    const context = await browser.newContext({ viewport: VP });
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.error(`[page] ${m.text()}`); });
    await page.clock.install();
    await page.goto(`${server.url}/?tier=high`, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: '.topbar, .pill, .menu, .skip, main .scene__frame > *, .scene__frame::before { visibility: hidden !important; }' });
    await page.evaluate((frac) => {
      const scene = document.getElementById('halcyon-somatics');
      const track = scene.querySelector('.scene__track');
      const top = scene.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (track.offsetHeight - window.innerHeight) * frac);
    }, SCROLL);
    let live = false;
    for (let i = 0; i < 1200 && !live; i++) { // up to 120 s of fake time; real waits let the assets load
      await page.clock.runFor(100);
      await page.waitForTimeout(25);
      live = await page.evaluate(() => document.getElementById('halcyon-somatics').classList.contains('is-live'));
    }
    if (!live) throw new Error('the HALCYON chapter never went live');
    for (let i = 0; i < 20; i++) { await page.clock.runFor(100); await page.waitForTimeout(25); }
    const canvas = page.locator('canvas.stage');
    for (let i = 0; i < FRAME_COUNT; i++) {
      await page.mouse.move(VP.width * (0.3 + 0.4 * (i / (FRAME_COUNT - 1))), VP.height * 0.5);
      await page.clock.runFor(1000 / FPS);
      await canvas.screenshot({ path: `${FRAMES}/f${String(i + 1).padStart(4, '0')}.png` });
    }
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

// Trim the lead-in of Part 1. Playwright's recorder opens with a few grey, undersized frames, and the boot screen
// can start out black. The recording's own timeline runs shorter than the wall clock, so its real length is read back.
const info = await run(ffmpegPath, ['-i', recording]).catch((e) => e);
const dm = /Duration: (\d+):(\d+):([\d.]+)/.exec(`${info.stderr || ""}`);
const recLen = +dm[1] * 3600 + +dm[2] * 60 + parseFloat(dm[3]);
await fs.rm(`${TMP}/boot-frames`, { recursive: true, force: true });
await fs.mkdir(`${TMP}/boot-frames`, { recursive: true });
await run(ffmpegPath, ['-y', '-i', recording, '-vf', 'fps=20,scale=320:-2', `${TMP}/boot-frames/b%04d.png`]);
const names = (await fs.readdir(`${TMP}/boot-frames`)).sort();
let first = 0;
for (let i = 0; i < names.length; i++) { // first frame that is full size (its bottom-right corner is not the recorder's grey padding)
  const { data, info: im } = await sharp(`${TMP}/boot-frames/${names[i]}`).raw().toBuffer({ resolveWithObject: true });
  const o = (im.height * im.width - 1) * im.channels;
  if (data[o] < 90 || data[o] > 170) { first = i; break; }
}
const blackEnd = first / 20;
const part1 = recLen - blackEnd;
console.log(`recording ${recLen.toFixed(2)} s (wall clock to boot end + 1.5 s: ${cut.toFixed(2)} s), lead-in trimmed ${blackEnd.toFixed(2)} s, part 1 = ${part1.toFixed(2)} s`);
if (part1 < 1.5) throw new Error('part 1 is too short');
const total = part1 + FRAME_COUNT / FPS - FADE;

const tmp = `${TMP}/halcyon-screen.mp4`;
await run(ffmpegPath, ['-y',
  '-ss', String(blackEnd), '-t', String(part1), '-i', recording,
  '-framerate', String(FPS), '-i', `${FRAMES}/f%04d.png`,
  '-filter_complex',
  `[0:v]scale=1280:-2,fps=${FPS},format=yuv420p,setsar=1[a];[1:v]scale=1280:-2,fps=${FPS},format=yuv420p,setsar=1[b];` +
  `[a][b]xfade=transition=fade:duration=${FADE}:offset=${(part1 - FADE).toFixed(3)},fade=t=out:st=${(total - 0.5).toFixed(3)}:d=0.5[v]`,
  '-map', '[v]', '-an', '-map_metadata', '-1', '-metadata', 'encoder=',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p',
  '-bsf:v', 'filter_units=remove_types=6', '-fflags', '+bitexact', '-movflags', '+faststart', tmp]);
await fs.copyFile(tmp, `${OUT}/screen.mp4`);
await sharp(`${FRAMES}/f0090.png`).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(`${OUT}/screen-poster.webp`);
const { size } = await fs.stat(`${OUT}/screen.mp4`);
console.log(`wrote ${OUT}/screen.mp4 (${(size / 1024 / 1024).toFixed(2)} MB, ${total.toFixed(1)} s) and ${OUT}/screen-poster.webp`);
