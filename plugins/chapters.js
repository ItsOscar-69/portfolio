// Vite plugin: checks src/content/projects.js and renders it into index.html at build (and dev) time.
import fs from 'node:fs';
import path from 'node:path';
import { projects } from '../src/content/projects.js';
import { validateProjects } from '../src/content/validate.js';
import { WORLD_NAMES } from '../src/worlds/names.js';
import { renderPage } from '../src/content/render.js';
import sharp from 'sharp';

export function sliceLines(text, lines) {
  if (!lines) return text.replace(/\s+$/, '');
  const [from, to] = lines;
  return text.split(/\r?\n/).slice(from - 1, to).join('\n');
}

// Adds what the renderer needs but authors shouldn't have to type: code text, image sizes, 900px variants.
export async function prepareProjects(list, publicDir) {
  return Promise.all(list.map(async (p) => {
    const file = (name) => path.join(publicDir, 'projects', p.id, name);
    const media = await Promise.all(p.media.map(async (m) => {
      if (m.type === 'code') return { ...m, code: sliceLines(fs.readFileSync(file(m.src), 'utf8'), m.lines) };
      if (m.type === 'image') {
        const { width, height } = await sharp(file(m.src)).metadata();
        const hasSmall = /\.webp$/i.test(m.src) && fs.existsSync(file(m.src.replace(/\.webp$/i, '-900.webp')));
        return { ...m, width, height, hasSmall };
      }
      if (m.type === 'video') {
        const { width, height } = await sharp(file(m.poster)).metadata(); // reserves the video's space before the poster arrives
        return { ...m, width, height };
      }
      return m;
    }));
    return { ...p, media };
  }));
}

// The dev server doesn't serve folder index pages from public/ (e.g. /halcyon/); this rewrites them.
export function publicIndexRewrite(base, publicDir) {
  return (req, _res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith(base)) {
      const rel = url.pathname.slice(base.length);
      if (rel && rel.endsWith('/') && fs.existsSync(path.join(publicDir, rel, 'index.html'))) {
        req.url = `${base}${rel}index.html${url.search}`;
      }
    }
    next();
  };
}

// True only if rel exists under root with exactly this spelling. GitHub Pages is case-sensitive and Windows isn't,
// so "Cover.webp" passes fs.existsSync here and 404s on the live site.
export function existsExactly(root, rel) {
  let dir = root;
  for (const part of rel.split('/').filter(Boolean)) {
    let names;
    try { names = fs.readdirSync(dir); } catch { return false; }
    if (!names.includes(part)) return false;
    dir = path.join(dir, part);
  }
  return fs.existsSync(dir);
}

export function checkProjects(list, publicDir) {
  const errors = validateProjects(list, { worldNames: WORLD_NAMES, fileExists: (rel) => existsExactly(publicDir, rel) });
  if (errors.length) throw new Error(`Content check failed (src/content/projects.js):\n  - ${errors.join('\n  - ')}`);
}

export default function chapters({ base, list = projects }) {
  let publicDir = path.resolve('public');
  return {
    name: 'portfolio-chapters',
    configResolved(config) { publicDir = config.publicDir; },
    configureServer(server) { server.middlewares.use(publicIndexRewrite(base, publicDir)); },
    buildStart() { checkProjects(list, publicDir); },
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        checkProjects(list, publicDir);
        return renderPage(html, await prepareProjects(list, publicDir), { base });
      },
    },
  };
}
