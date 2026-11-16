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
  it('rejects ids the page already uses', () => {
    for (const id of ['top', 'hero', 'next', 'main', 'chapter-menu']) {
      expect(errorsFor({ id }).join(' ')).toContain(`"id" "${id}" is reserved by the page`);
    }
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
