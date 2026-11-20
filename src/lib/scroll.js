export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// scenes: [{ start, length }] sorted by start (document px). length = scroll distance of the scene's intro.
export function sceneState(y, vh, scenes) {
  if (!scenes.length) return { active: -1, next: -1, progress: 0, transition: 0, display: -1 };
  let active = 0;
  for (let i = 0; i < scenes.length; i++) if (scenes[i].start <= y) active = i;
  const next = active + 1 < scenes.length ? active + 1 : -1;
  const progress = clamp01((y - scenes[active].start) / Math.max(1, scenes[active].length));
  const transition = next === -1 ? 0 : clamp01((y + vh - scenes[next].start) / vh);
  const display = transition > 0.5 ? next : active;
  return { active, next, progress, transition, display };
}

// panels: [{ top, bottom }] in document px. True while one of them covers the whole viewport, so nothing behind it
// can be seen.
export function coveredBy(y, vh, panels) {
  return panels.some((p) => p.top <= y && p.bottom >= y + vh);
}
