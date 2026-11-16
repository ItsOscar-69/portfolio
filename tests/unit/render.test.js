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
  it('escapes filenames in src, srcset and poster attributes', () => {
    const img = renderMedia({ type: 'image', src: 'a"b&c.webp', alt: 'A', hasSmall: true }, p, '/');
    expect(img).toContain('src="/projects/demo/a&quot;b&amp;c.webp"');
    expect(img).toContain('/projects/demo/a&quot;b&amp;c.webp 1800w');
    expect(img).not.toContain('a"b');
    const video = renderMedia({ type: 'video', src: 'c.mp4', poster: 'p"q.webp', alt: 'A' }, p, '/');
    expect(video).toContain('poster="/projects/demo/p&quot;q.webp"');
  });
  it('escapes code', () => {
    expect(renderMedia({ type: 'code', src: 'a.py', code: 'if a < b:\n  print("x")' }, p, '/')).toContain('if a &lt; b:');
    expect(renderMedia({ type: 'code', src: 'a.py', code: 'x' }, p, '/')).toContain('<pre tabindex="0" data-lenis-prevent>');
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
