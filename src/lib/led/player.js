import { FPS } from './maths.js';
import { createShow } from './show.js';

// Like boot.py's wait_frame() (line 301): when running behind, don't try to catch up.
const MAX_FRAMES_PER_TICK = 5;

// Turns wall-clock time into the show's 50 fps frames. Two things may drive it: the pico world's update() while the
// 3D chapter is live ('world'), and the page's own loop otherwise ('page'), e.g. under reduced motion or without
// WebGL. A page tick is skipped whenever the world has ticked since the last page tick, so the show never runs at
// double speed.
export function createPlayer({ seed = 1543 } = {}) {
  const show = createShow({ seed });
  const listeners = new Set();
  let carry = 0;
  let worldTicks = 0;
  let worldTicksSeenByPage = 0;

  const player = {
    state: show.state(),
    playing: true,
    advance(seconds, source = 'page') {
      if (source === 'world') worldTicks += 1;
      else {
        const worldRan = worldTicks !== worldTicksSeenByPage;
        worldTicksSeenByPage = worldTicks;
        if (worldRan) return player.state;
      }
      if (!player.playing) return player.state;
      carry += seconds * FPS;
      const due = Math.floor(carry);
      carry -= due;
      const frames = Math.min(due, MAX_FRAMES_PER_TICK);
      for (let i = 0; i < frames; i++) player.state = show.step();
      if (frames) notify();
      return player.state;
    },
    select(index) {
      show.select(index);
      player.playing = true;
      notify();
    },
    play() {
      player.playing = true;
      notify();
    },
    pause() {
      player.playing = false;
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  const notify = () => listeners.forEach((fn) => fn(player.state));
  return player;
}

let shared = null;
// The page's one light show: the pico world and the page's controls both use it.
export function sharedPlayer() {
  if (!shared) shared = createPlayer();
  return shared;
}
