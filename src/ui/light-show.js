import { EFFECTS, POWER_UP } from '../lib/led/effects.js';
import { NUM_LEDS } from '../lib/led/maths.js';
import { sharedPlayer } from '../lib/led/player.js';
import { createHighlighter } from '../lib/led/highlight.js';

const byName = Object.fromEntries([POWER_UP, ...EFFECTS].map((e) => [e.name, e]));
const channel = (v) => Math.max(0, Math.min(255, v));
const rgb = ([r, g, b]) => `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`;

// The Pico chapter's controls, built when the page has a chapter running the pico world:
// - over the 3D strip: play/pause and one chip per effect;
// - at the top of the live code panel: the effect that's playing and a strip of 20 dots in the LEDs' colours
//   (with no 3D world, for example under reduced motion, this is where you watch the show);
// - in the code panel: the boot.py line the show is running, highlighted.
// The page's own loop drives the shared player while the chapter is on screen; the player ignores it whenever the
// 3D world is driving (see player.js).
export function createLightShow({ doc, reduced = false }) {
  const chapter = doc.querySelector('.scene[data-world="pico"]');
  if (!chapter) return null;
  const win = doc.defaultView;
  const player = sharedPlayer();
  if (reduced) player.pause(); // spec §8.2: demos only run when the visitor presses play

  const button = (className, text) => {
    const el = doc.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = text;
    return el;
  };
  const controls = doc.createElement('div');
  controls.className = 'lightshow';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Light show');
  const playButton = button('lightshow__play', 'Pause');
  playButton.addEventListener('click', () => (player.playing ? player.pause() : player.play()));
  const chips = EFFECTS.map((effect, index) => {
    const chip = button('chip', effect.label);
    chip.dataset.effect = effect.name;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => player.select(index));
    return chip;
  });
  controls.append(playButton, ...chips);
  chapter.querySelector('.chapter__hook').after(controls);

  const figure = chapter.querySelector('.media--code[data-live]');
  const pre = figure ? figure.querySelector('pre') : null;
  const lineEls = new Map(pre ? Array.from(pre.querySelectorAll('.code-line'), (el) => [Number(el.dataset.line), el]) : []);
  let dots = [];
  let nameEl = null;
  if (figure) {
    const now = doc.createElement('div');
    now.className = 'lightshow__now';
    const strip = doc.createElement('span');
    strip.className = 'lightshow__strip';
    strip.setAttribute('aria-hidden', 'true');
    dots = Array.from({ length: NUM_LEDS }, () => strip.appendChild(doc.createElement('i')));
    nameEl = doc.createElement('span');
    nameEl.className = 'lightshow__name mono';
    now.append(strip, nameEl);
    figure.prepend(now);
  }

  // Scrolls the code box itself, never the page.
  const reveal = (el, atTop) => {
    if (!pre || !el) return;
    const outside = el.offsetTop < pre.scrollTop || el.offsetTop + el.offsetHeight > pre.scrollTop + pre.clientHeight;
    if (atTop || outside) pre.scrollTop = Math.max(0, el.offsetTop - (atTop ? 8 : pre.clientHeight / 3));
  };

  const pick = createHighlighter();
  let shownPlaying = null;
  let shownEffect = null;
  let shownFrame = -1;
  let shownLine = null;
  function render(state) {
    if (player.playing !== shownPlaying) {
      shownPlaying = player.playing;
      playButton.textContent = player.playing ? 'Pause' : 'Play';
    }
    if (state.effect !== shownEffect) {
      shownEffect = state.effect;
      chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.effect === state.effect)));
      if (nameEl) nameEl.textContent = state.effect;
      reveal(lineEls.get(byName[state.effect].lines[0]), true);
    }
    if (state.frame !== shownFrame) {
      shownFrame = state.frame;
      state.colours.forEach((c, i) => { if (dots[i]) dots[i].style.backgroundColor = rgb(c); });
    }
    const line = pick(state.line, byName[state.effect].restLine, win.performance.now());
    if (line !== shownLine) {
      lineEls.get(shownLine)?.classList.remove('is-running');
      shownLine = line;
      const el = lineEls.get(line);
      if (el) {
        el.classList.add('is-running');
        reveal(el, false);
      }
    }
  }
  player.subscribe(render);
  render(player.state);

  // The page's loop: runs while the chapter is on screen and the tab is visible.
  let raf = 0;
  let last = 0;
  let onScreen = false;
  const loop = (time) => {
    raf = win.requestAnimationFrame(loop);
    const seconds = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    player.advance(seconds, 'page');
  };
  const run = () => {
    if (onScreen && !doc.hidden && !raf) {
      last = 0;
      raf = win.requestAnimationFrame(loop);
    }
  };
  const stop = () => {
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
  };
  if ('IntersectionObserver' in win) {
    new win.IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) run();
      else stop();
    }).observe(chapter);
  } else {
    onScreen = true;
    run();
  }
  doc.addEventListener('visibilitychange', () => (doc.hidden ? stop() : run()));
  return { player, controls };
}
