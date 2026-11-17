import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseLayerManifest } from '../../src/lib/layer-manifest.js';

const valid = () => ({
  width: 100,
  height: 200,
  layers: [
    { name: 'backdrop', fill: '#161616', x: 0, y: 0, w: 100, h: 200 },
    { name: 'title', file: 'title.webp', x: 10, y: 20, w: 80, h: 40 },
  ],
});

describe('parseLayerManifest', () => {
  it('returns the canvas size and layers back to front', () => {
    const m = parseLayerManifest(valid());
    expect(m.width).toBe(100);
    expect(m.layers.map((l) => l.name)).toEqual(['backdrop', 'title']);
    expect(m.layers[0]).toEqual({ name: 'backdrop', fill: '#161616', x: 0, y: 0, w: 100, h: 200 });
    expect(m.layers[1]).toEqual({ name: 'title', file: 'title.webp', x: 10, y: 20, w: 80, h: 40 });
  });
  it('rejects a missing canvas size or an empty layer list', () => {
    expect(() => parseLayerManifest({ ...valid(), width: 0 })).toThrow(/width and height/);
    expect(() => parseLayerManifest({ ...valid(), layers: [] })).toThrow(/at least one layer/);
    expect(() => parseLayerManifest(null)).toThrow(/must be an object/);
  });
  it('needs exactly one of file or fill, and names the layer', () => {
    const both = valid(); both.layers[1].fill = '#ffffff';
    expect(() => parseLayerManifest(both)).toThrow(/layer 2 \(title\): needs exactly one of "file"/);
    const neither = valid(); delete neither.layers[1].file;
    expect(() => parseLayerManifest(neither)).toThrow(/layer 2 \(title\): needs exactly one of "file"/);
    const badFill = valid(); badFill.layers[0].fill = 'grey';
    expect(() => parseLayerManifest(badFill)).toThrow(/layer 1 \(backdrop\)/);
  });
  it('only accepts bare .webp file names, so worlds load files beside their manifest', () => {
    for (const file of ['../x.webp', 'sub/x.webp', 'a\\x.webp', 'x.png']) {
      const m = valid(); m.layers[1].file = file;
      expect(() => parseLayerManifest(m)).toThrow(/needs exactly one of "file"/);
    }
  });
  it('rejects boxes outside the canvas', () => {
    const m = valid(); m.layers[1].x = 30; // 30 + 80 > 100
    expect(() => parseLayerManifest(m)).toThrow(/box must sit inside the 100x200 canvas/);
    const n = valid(); n.layers[1].w = 0;
    expect(() => parseLayerManifest(n)).toThrow(/box must sit inside/);
  });
});

describe('the published DEAD TIRED layer stack', () => {
  const dir = 'public/projects/dead-tired/layers';
  const manifest = parseLayerManifest(JSON.parse(fs.readFileSync(path.join(dir, 'layers.json'), 'utf8')));

  it('is the full 4193x4801 canvas: the shirt as a flat colour, then eight image layers', () => {
    expect([manifest.width, manifest.height]).toEqual([4193, 4801]);
    expect(manifest.layers[0]).toMatchObject({ name: 'SHIRT', x: 0, y: 0, w: 4193, h: 4801 });
    expect(manifest.layers[0].fill).toMatch(/^#[0-9a-f]{6}$/);
    expect(manifest.layers.filter((l) => l.file)).toHaveLength(8);
  });

  it('has every image, each shaped like its box (so the stack lines up)', async () => {
    for (const layer of manifest.layers.filter((l) => l.file)) {
      const file = path.join(dir, layer.file);
      expect(fs.existsSync(file), layer.file).toBe(true);
      const { width, height } = await sharp(file).metadata();
      expect(Math.abs(width / height - layer.w / layer.h), layer.file).toBeLessThan(0.05 * (layer.w / layer.h) + 0.02);
    }
  });
});
