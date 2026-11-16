// Which worlds to create and which to free, given the active scene.
// Loads the active scene and the next one; keeps the one behind; frees anything 2+ away.
export function lifecyclePlan(active, loaded, sceneCount) {
  const inRange = (i) => i >= 0 && i < sceneCount;
  const load = [active, active + 1].filter((i) => inRange(i) && !loaded.has(i));
  const dispose = [...loaded].filter((i) => Math.abs(i - active) >= 2).sort((a, b) => a - b);
  return { load, dispose };
}
