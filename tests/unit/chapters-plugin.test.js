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
