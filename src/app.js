import Lenis from 'lenis';
import { sceneState } from './lib/scroll.js';
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

export async function startApp({ win = window, doc = document } = {}) {
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = readScenes(doc);

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

  if (!lenis) { win.addEventListener('scroll', updateUi, { passive: true }); return; }
  const tick = (now) => { win.requestAnimationFrame(tick); lenis.raf(now); updateUi(); };
  win.requestAnimationFrame(tick);
}
