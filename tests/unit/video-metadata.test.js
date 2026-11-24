// Guards the published videos against hidden data: no encoder note, no muxer tags, no location, no audio track.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const FORBIDDEN = ['x264 - core', '©too', '©nam', '©day', 'location', 'soun'];

describe('published videos carry no metadata or audio', () => {
  for (const file of ['public/projects/halcyon-somatics/screen.mp4', 'public/projects/ascii-mirror/demo.mp4']) {
    it(file, () => {
      const bytes = fs.readFileSync(file).toString('latin1');
      for (const needle of FORBIDDEN) expect(bytes.includes(needle), `${file} contains "${needle}"`).toBe(false);
    });
  }
});
