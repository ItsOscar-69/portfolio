export const MEDIA_TYPES = ['image', 'video', 'model', 'code', 'link'];
const RESERVED_IDS = ['top', 'hero', 'next', 'main', 'chapter-menu'];
export const FONT_KEYS = ['michroma', 'big-shoulders', 'mono'];
const REQUIRED_TEXT = ['id', 'title', 'hook', 'date', 'status', 'world', 'headline', 'summary'];
const HEX = /^#[0-9a-f]{6}$/i;
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

export function validateProjects(projects, { worldNames, fileExists }) {
  if (!Array.isArray(projects) || projects.length === 0) return ['the project list must contain at least one project'];
  const errors = [];
  const seen = new Set();

  projects.forEach((p, i) => {
    const where = `project ${i + 1}${p && isText(p.id) ? ` (${p.id})` : ''}`;
    const fail = (msg) => errors.push(`${where}: ${msg}`);
    if (!p || typeof p !== 'object') { fail('must be an object'); return; }

    REQUIRED_TEXT.forEach((key) => { if (!isText(p[key])) fail(`"${key}" is required and must be text`); });
    if (isText(p.id)) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)) fail('"id" must be kebab-case, like "my-project"');
      if (RESERVED_IDS.includes(p.id)) fail(`"id" "${p.id}" is reserved by the page`);
      if (seen.has(p.id)) fail('"id" is already used by another project');
      seen.add(p.id);
    }
    if (p.shortTitle !== undefined && !isText(p.shortTitle)) fail('"shortTitle" must be text when given');
    if (isText(p.date) && !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.date)) fail('"date" must look like YYYY-MM');
    if (isText(p.status) && !['done', 'in-progress'].includes(p.status)) fail('"status" must be "done" or "in-progress"');
    if (!Array.isArray(p.tags) || p.tags.length < 1 || p.tags.length > 5 || !p.tags.every(isText)) fail('"tags" must be a list of 1 to 5 labels');
    if (isText(p.world) && !worldNames.includes(p.world)) fail(`world "${p.world}" is not registered (known worlds: ${worldNames.join(', ')})`);
    if (p.font !== undefined && !FONT_KEYS.includes(p.font)) fail(`"font" must be one of: ${FONT_KEYS.join(', ')}`);

    const c = p.cards;
    if (!c || !isText(c.idea) || !isText(c.built) || !isText(c.inside)) fail('"cards" needs "idea", "built" and "inside" text');

    const o = p.worldOptions;
    if (o !== undefined && (typeof o !== 'object' || o === null || Array.isArray(o))) fail('"worldOptions" must be an object');
    if (o && o.palette !== undefined && (!Array.isArray(o.palette) || !o.palette.every((h) => typeof h === 'string' && HEX.test(h)))) {
      fail('"worldOptions.palette" must be a list of colours like "#39ff88"');
    }
    if (p.world === 'picture') {
      if (!o || !isText(o.cover)) fail('the "picture" world needs "worldOptions.cover"');
      else if (!fileExists(`projects/${p.id}/${o.cover}`)) fail(`cover file not found: public/projects/${p.id}/${o.cover}`);
    }

    if (!Array.isArray(p.media) || p.media.length === 0) fail('"media" needs at least one item');
    else p.media.forEach((m, j) => {
      const at = `media ${j + 1}`;
      if (!m || !MEDIA_TYPES.includes(m.type)) { fail(`${at}: "type" must be one of ${MEDIA_TYPES.join(', ')}`); return; }
      if (!isText(m.src)) { fail(`${at}: "src" is required`); return; }
      if (m.type === 'link') { if (!isText(m.caption)) fail(`${at}: a link needs a "caption" to use as its label`); return; }
      if (!fileExists(`projects/${p.id}/${m.src}`)) fail(`${at}: file not found: public/projects/${p.id}/${m.src}`);
      if (['image', 'video', 'model'].includes(m.type) && !isText(m.alt)) fail(`${at}: "alt" text is required for ${m.type} media`);
      if (['video', 'model'].includes(m.type)) {
        if (!isText(m.poster)) fail(`${at}: "poster" is required for ${m.type} media`);
        else if (!fileExists(`projects/${p.id}/${m.poster}`)) fail(`${at}: poster not found: public/projects/${p.id}/${m.poster}`);
      }
      if (m.type === 'code' && m.lines !== undefined) {
        const ok = Array.isArray(m.lines) && m.lines.length === 2 && m.lines.every(Number.isInteger) && m.lines[0] >= 1 && m.lines[0] <= m.lines[1];
        if (!ok) fail(`${at}: "lines" must be [first, last] line numbers`);
      }
    });

    if (p.links !== undefined && (!Array.isArray(p.links) || !p.links.every((l) => l && isText(l.label) && isText(l.href)))) {
      fail('"links" must be a list of { label, href }');
    }
  });
  return errors;
}
