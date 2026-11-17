import { NUM_LEDS, EFFECT_SECONDS, FADE_FRAMES, FRAME_MS, int } from './maths.js';
import { createRandom } from './random.js';
import { POWER_UP, EFFECTS } from './effects.js';

// boot.py's light_show() (lines 304-346) as a frame-by-frame state machine: power_up plays for 2600 ms, then each
// effect crossfades in over 50 frames and plays for 15 s, in order, forever. step() is one 20 ms frame.
export const INTRO_FRAMES = 2600 / FRAME_MS; // 130
export const PLAY_FRAMES = (EFFECT_SECONDS * 1000) / FRAME_MS; // 750

const black = () => Array.from({ length: NUM_LEDS }, () => [0, 0, 0]);
const copy = (px) => px.map((c) => c.slice());

export function createShow({ seed = 1543 } = {}) {
  const random = createRandom(seed);
  const start = (effect) => {
    const px = black();
    return { effect, px, gen: effect.run(px, random), line: effect.restLine };
  };

  let current = start(POWER_UP);
  let incoming = null; // the effect fading in, during a crossfade
  let fadeFrame = 0;
  let playLeft = INTRO_FRAMES;
  let next = 0; // the EFFECTS index autoplay starts next
  let frame = 0;
  let phase = 'intro';
  let shown = black();

  const state = () => {
    const on = incoming || current;
    return { frame, colours: shown, effect: on.effect.name, line: on.line, phase };
  };
  const beginFade = (effect) => {
    incoming = start(effect);
    fadeFrame = 0;
  };

  return {
    state,
    // One frame of boot.py's play() or crossfade().
    step() {
      if (!incoming && playLeft === 0) {
        beginFade(EFFECTS[next]);
        next = (next + 1) % EFFECTS.length;
      }
      frame += 1;
      if (incoming) {
        if (current.gen) current.line = current.gen.next().value; // 320: next(gen)
        incoming.line = incoming.gen.next().value; // 321: next(new_gen)
        fadeFrame += 1;
        const t = fadeFrame / FADE_FRAMES;
        shown = current.px.map((a, i) => {
          const b = incoming.px[i];
          return [int(a[0] + (b[0] - a[0]) * t), int(a[1] + (b[1] - a[1]) * t), int(a[2] + (b[2] - a[2]) * t)];
        });
        phase = 'fade';
        if (fadeFrame === FADE_FRAMES) {
          current = incoming;
          incoming = null;
          playLeft = PLAY_FRAMES;
        }
      } else {
        current.line = current.gen.next().value;
        shown = copy(current.px);
        phase = current.effect === POWER_UP ? 'intro' : 'play';
        playLeft -= 1;
      }
      return state();
    },
    // A visitor picked an effect. Crossfade from whatever is on screen into a fresh start of it, then carry on in
    // order from there. (Not in boot.py, which has no buttons.)
    select(index) {
      if (incoming) current = { effect: incoming.effect, px: copy(shown), gen: null, line: incoming.line }; // freeze the half-blended frame
      beginFade(EFFECTS[index]);
      next = (index + 1) % EFFECTS.length;
    },
  };
}
