// Records the Windows ASCII demo Claude Code wrote for Oscar (raw/ascii/ascii_cyberpunk.py, gitignored) and publishes
// it for the ASCII Mirror chapter: demo.mp4 (H.264, no audio, metadata stripped) and demo-poster.webp.
// Needs the `py` launcher with the demo's own requirements, pygame-ce and numpy.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

const SRC = 'raw/ascii/ascii_cyberpunk.py';
const OUT = 'public/projects/ascii-mirror';
const FPS = 30;
const SECONDS = 10;

if (!fs.existsSync(SRC)) throw new Error(`${SRC} is missing: copy the demo there first (raw/ is gitignored)`);
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${path.basename(cmd)} failed (${result.status ?? result.error})`);
};
const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'ascii-demo-'));
try {
  run('py', ['tools/record-ascii-demo.py', SRC, frames, String(FPS * SECONDS), String(FPS)]);
  run(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart',
    '-bsf:v', 'filter_units=remove_types=6', '-map_metadata', '-1', '-fflags', '+bitexact', '-an', path.join(frames, 'demo.mp4')]);
  await sharp(path.join(frames, 'f0120.png')).resize({ width: 1280 }).webp({ quality: 82 }).toFile(path.join(frames, 'demo-poster.webp'));
  fs.mkdirSync(OUT, { recursive: true });
  for (const name of ['demo.mp4', 'demo-poster.webp']) fs.copyFileSync(path.join(frames, name), path.join(OUT, name)); // copy: the temp dir may be on another drive
  console.log(`wrote ${OUT}/demo.mp4 and ${OUT}/demo-poster.webp`);
} finally {
  fs.rmSync(frames, { recursive: true, force: true });
}
