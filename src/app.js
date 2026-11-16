import Lenis from 'lenis';
import { sceneState } from './lib/scroll.js';
import { lifecyclePlan } from './lib/lifecycle.js';
import { createMenu } from './ui/menu.js';
import { createPill } from './ui/pill.js';

export function readScenes(doc) {
  return Array.from(doc.querySelectorAll('.scene')).map((el) => ({
    el,
    id: el.dataset.sceneId,
    world: el.dataset.world,
    options: JSON.parse(el.dataset.worldOptions || '{}'),
  }));
}

function measure(scenes, win) {
  const y = win.scrollY;
  const vh = win.innerHeight;
  return scenes.map(({ el }) => {
    const track = el.querySelector('.scene__track') || el;
    return { start: el.getBoundingClientRect().top + y, length: Math.max(1, track.offsetHeight - vh) };
  });
}

async function renderStill(stage, scenes, id, params, html) {
  html.classList.add('still');
  const index = scenes.findIndex((s) => s.id === id);
  if (!stage || index < 0) { html.dataset.stillReady = 'error'; return; }
  stage.ensure(index, scenes[index].world, scenes[index].options);
  try { await stage.whenReady(index); } catch { html.dataset.stillReady = 'error'; return; }
  const state = { active: index, next: -1, progress: Number(params.get('p') ?? 0.8), transition: 0, display: index };
  for (let f = 0; f < 90; f++) stage.frame({ time: 6 + f / 30, delta: 1 / 30, state, pointer: { x: 0, y: 0 } });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  html.dataset.stillReady = '1';
}

export async function startApp({ win = window, doc = document } = {}) {
  const html = doc.documentElement;
  const params = new URLSearchParams(win.location.search);
  const still = params.get('still');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = readScenes(doc);

  // ---- 3D stage: skipped for reduced motion and ?posters. three.js loads here, after first paint.
  let stage = null;
  const failed = new Set();
  if (still || (!reduced && !params.has('posters'))) {
    try {
      const { createStage } = await import('./stage/stage.js');
      stage = createStage(doc.querySelector('canvas.stage'), {
        tierOverride: params.get('tier'),
        onReady: (i) => scenes[i].el.classList.add('is-live'),
        onRelease: (i) => scenes[i].el.classList.remove('is-live'),
        onFail: (i, err) => {
          failed.add(i);
          scenes[i].el.classList.remove('is-live');
          scenes[i].el.classList.add('is-failed');
          console.error(`[stage] the "${scenes[i].id}" world failed; showing its poster instead.`, err);
        },
        onContextLost: () => {
          stage = null;
          html.classList.remove('webgl');
          console.warn('[stage] WebGL context lost; showing posters.');
        },
      });
      html.classList.add('webgl');
    } catch (err) {
      stage = null;
      console.warn('[stage] WebGL is unavailable; showing posters.', err);
    }
  }

  if (still) { await renderStill(stage, scenes, still, params, html); return; }

  // ---- smooth scroll and in-page links
  const lenis = reduced ? null : new Lenis({ autoRaf: false });
  const goTo = (id) => {
    const target = doc.getElementById(id);
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, {
        duration: 1.4,
        // If anything above changed height mid-flight, finish exactly on the target.
        onComplete: () => { if (Math.abs(target.getBoundingClientRect().top) > 2) lenis.scrollTo(target, { immediate: true }); },
      });
    } else target.scrollIntoView({ block: 'start' });
    const heading = target.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  };
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('#chapter-menu')) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || !doc.getElementById(id)) return;
    e.preventDefault();
    goTo(id);
  });

  // ---- pill and menu
  const pill = createPill(doc.querySelector('.pill'), scenes);
  const menu = createMenu({
    menu: doc.getElementById('chapter-menu'),
    triggers: Array.from(doc.querySelectorAll('[aria-controls="chapter-menu"]')),
    onSelect: goTo,
  });

  let layout = measure(scenes, win);
  let state = sceneState(win.scrollY, win.innerHeight, layout);
  const updateUi = () => {
    state = sceneState(win.scrollY, win.innerHeight, layout);
    pill.update(state.display);
    menu.setCurrent(state.display - 1);
  };
  const remeasure = () => { layout = measure(scenes, win); updateUi(); };
  win.addEventListener('resize', remeasure);
  if ('ResizeObserver' in win) new win.ResizeObserver(remeasure).observe(doc.body);
  doc.fonts?.ready.then(remeasure);
  updateUi();

  const pointer = { x: 0, y: 0 };
  win.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / win.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / win.innerHeight) * 2 - 1;
  }, { passive: true });

  if (!stage && !lenis) { win.addEventListener('scroll', updateUi, { passive: true }); return; }

  // ---- one loop for scrolling, UI and the stage; pauses while the tab is hidden
  let raf = 0;
  let last = performance.now();
  const tick = (now) => {
    raf = win.requestAnimationFrame(tick);
    const delta = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (lenis) lenis.raf(now);
    updateUi();
    if (!stage) return;
    const plan = lifecyclePlan(state.active, stage.loaded(), scenes.length);
    plan.dispose.forEach((i) => stage.release(i));
    plan.load.forEach((i) => { if (!failed.has(i)) stage.ensure(i, scenes[i].world, scenes[i].options); });
    stage.frame({ time: now / 1000, delta, state, pointer });
  };
  raf = win.requestAnimationFrame(tick);
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) { win.cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = performance.now(); raf = win.requestAnimationFrame(tick); }
  });
}
