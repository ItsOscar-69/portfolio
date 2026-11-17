import { Vector2 } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Glow for worlds that ask for it. It blooms a render target in place: when it isn't rendering to the screen,
// UnrealBloomPass blends its result back onto the target it read. The pass and its half-float targets are made on
// first use, so a visit that never reaches a blooming world never pays for them.
export function createBloom() {
  let pass = null;
  let width = 1;
  let height = 1;
  return {
    resize(w, h) {
      width = w;
      height = h;
      if (pass) pass.setSize(w, h);
    },
    apply(renderer, target, { strength = 1, radius = 0.5, threshold = 0 } = {}) {
      if (!pass) pass = new UnrealBloomPass(new Vector2(width, height), strength, radius, threshold);
      pass.strength = strength;
      pass.radius = radius;
      pass.threshold = threshold;
      pass.render(renderer, null, target, 0, false);
    },
    dispose() {
      if (pass) pass.dispose();
      pass = null;
    },
  };
}
