import { WORLD_ASSETS } from '../worlds/names.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
export const pad2 = (n) => String(n).padStart(2, '0');

export function withBase(base, href) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('//')) return href;
  if (href.startsWith('/')) return base.replace(/\/+$/, '') + href;
  return href;
}

export function formatDate(ym) {
  const [year, month] = ym.split('-').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export const assetUrl = (base, id, file) => withBase(base, `/projects/${id}/${file}`);

export function posterImg(id, base, lazy) {
  return `<img class="scene__poster" src="${escapeHtml(withBase(base, `/posters/${id}.webp`))}" alt="" aria-hidden="true" decoding="async"${lazy ? ' loading="lazy"' : ''}>`;
}

const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('');
const figcaption = (m) => (m.caption ? `<figcaption>${escapeHtml(m.caption)}</figcaption>` : '');

export function renderMedia(m, project, base) {
  const url = (file) => escapeHtml(assetUrl(base, project.id, file));
  switch (m.type) {
    case 'image': {
      const srcset = m.hasSmall
        ? ` srcset="${url(m.src.replace(/\.webp$/i, '-900.webp'))} 900w, ${url(m.src)} 1800w" sizes="(min-width: 900px) 50vw, 100vw"`
        : '';
      const size = m.width && m.height ? ` width="${m.width}" height="${m.height}"` : ''; // reserves space for lazy images
      return `<figure class="media media--image"><img src="${url(m.src)}"${srcset}${size} alt="${escapeHtml(m.alt)}" loading="lazy" decoding="async">${figcaption(m)}</figure>`;
    }
    case 'video': {
      const size = m.width && m.height ? ` width="${m.width}" height="${m.height}"` : '';
      return `<figure class="media media--video"><video src="${url(m.src)}" poster="${url(m.poster)}"${size} controls muted loop playsinline preload="none" data-autoplay aria-label="${escapeHtml(m.alt)}"></video>${figcaption(m)}</figure>`;
    }
    case 'model':
      return `<figure class="media media--model" data-model="${url(m.src)}"><img src="${url(m.poster)}" alt="${escapeHtml(m.alt)}" loading="lazy" decoding="async">${figcaption(m)}</figure>`;
    case 'code': {
      // One span per line, numbered as in the source file, so the light show can highlight the line it's running.
      const first = m.lines ? m.lines[0] : 1;
      const lines = (m.code ?? '').split(/\r?\n/).map((text, i) => `<span class="code-line" data-line="${first + i}">${escapeHtml(text)}</span>`).join('\n');
      return `<figure class="media media--code"${m.live ? ' data-live' : ''}><pre tabindex="0" data-lenis-prevent><code>${lines}</code></pre>${figcaption(m)}</figure>`;
    }
    case 'link':
      return `<a class="media media--link" href="${escapeHtml(withBase(base, m.src))}"><span>${escapeHtml(m.caption)}</span><span aria-hidden="true">↗</span></a>`;
    default:
      throw new Error(`unknown media type "${m.type}"`);
  }
}

function worldOptionsFor(project, base) {
  const options = { ...(project.worldOptions || {}) };
  for (const [key, kind] of Object.entries(WORLD_ASSETS[project.world] || {})) {
    if (kind === 'list' && Array.isArray(options[key])) options[key] = options[key].map((file) => assetUrl(base, project.id, file));
    else if (typeof options[key] === 'string') options[key] = assetUrl(base, project.id, options[key]);
  }
  return options;
}

export function renderChapter(project, index, base) {
  const n = pad2(index + 1);
  const id = escapeHtml(project.id);
  const font = project.font ? ` font-${project.font}` : '';
  const meta = [n, formatDate(project.date), ...project.tags].map(escapeHtml).join(' · ');
  const badge = project.status === 'in-progress' ? '<p class="badge">In progress</p>' : '';
  const links = (project.links || []).map((l) => `<a href="${escapeHtml(withBase(base, l.href))}">${escapeHtml(l.label)}</a>`).join('');
  const media = project.media.map((m) => renderMedia(m, project, base)).join('');
  const cards = [['The idea', project.cards.idea], ['How it was built', project.cards.built], ['Inside', project.cards.inside]]
    .map(([heading, text]) => `<article class="card"><h4>${heading}</h4><p>${escapeHtml(text)}</p></article>`)
    .join('');
  const options = escapeHtml(JSON.stringify(worldOptionsFor(project, base)));
  return `<section class="scene chapter" id="${id}" data-scene-id="${id}" data-world="${escapeHtml(project.world)}" data-world-options="${options}" data-number="${n}" data-title="${escapeHtml(project.title)}" data-short="${escapeHtml(project.shortTitle || project.title)}" aria-labelledby="${id}-title">
  <div class="scene__track"><div class="scene__frame">
    ${posterImg(project.id, base, true)}
    <p class="chapter__meta mono">${meta}</p>${badge}
    <h2 class="chapter__title${font}" id="${id}-title">${escapeHtml(project.title)}</h2>
    <p class="chapter__hook">${escapeHtml(project.hook)}</p>
  </div></div>
  <div class="chapter__panel">
    <div class="panel__row"><h3 class="panel__headline">${escapeHtml(project.headline)}</h3><div class="panel__body">${paragraphs(project.summary)}${links ? `<p class="panel__links">${links}</p>` : ''}</div></div>
    <div class="panel__media">${media}</div>
    <div class="panel__cards">${cards}</div>
  </div>
</section>`;
}

export function renderMenuItems(projects) {
  const items = projects.map((p, i) =>
    `<li><a class="menu__link" href="#${escapeHtml(p.id)}" data-target="${escapeHtml(p.id)}"><span class="mono">${pad2(i + 1)}</span><span>${escapeHtml(p.title)}</span></a></li>`);
  items.push(`<li class="menu__soon"><span class="mono">${pad2(projects.length + 1)}</span><span>Coming soon</span></li>`);
  return items.join('');
}

export const renderHeroLinks = (projects) =>
  projects.map((p) => `<a href="#${escapeHtml(p.id)}">${escapeHtml(p.shortTitle || p.title)}</a>`).join('');

export const renderCount = (n) => `${n} project${n === 1 ? '' : 's'}`;

export function renderPage(html, projects, { base }) {
  const replacements = [
    ['<!--@count-->', renderCount(projects.length)],
    ['<!--@hero-links-->', renderHeroLinks(projects)],
    ['<!--@hero-poster-->', posterImg('hero', base, false)],
    ['<!--@chapters-->', projects.map((p, i) => renderChapter(p, i, base)).join('\n')],
    ['<!--@next-number-->', pad2(projects.length + 1)],
    ['<!--@next-poster-->', posterImg('next', base, true)],
    ['<!--@menu-->', renderMenuItems(projects)],
  ];
  let out = html;
  for (const [marker, value] of replacements) {
    if (!out.includes(marker)) throw new Error(`index.html is missing the ${marker} marker`);
    out = out.split(marker).join(value);
  }
  return out;
}
