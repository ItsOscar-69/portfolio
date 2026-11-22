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
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-bsf:v', 'filter_units=remove_types=6', '-fflags', '+bitexact', '-movflags', '+faststart', `${OUT}/screen.mp4`]);
await run(ffmpegPath, ['-y', '-ss', '6', '-i', `${OUT}/screen.mp4`, '-frames:v', '1', 'raw/video/poster.png']);
await sharp('raw/video/poster.png').resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(`${OUT}/screen-poster.webp`);
const { size } = await fs.stat(`${OUT}/screen.mp4`);
console.log(`wrote ${OUT}/screen.mp4 (${(size / 1024 / 1024).toFixed(2)} MB) and ${OUT}/screen-poster.webp`);
