import * as THREE from 'three';
import { worldLoaders } from '../worlds/registry.js';
import { pickTier, TIER_SETTINGS } from '../lib/tier.js';
import { createCompositor } from './transition.js';

// Colours pass through untouched everywhere (screen and render targets), so transitions never shift colour.
THREE.ColorManagement.enabled = false;

function gpuName(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  } catch {
    return '';
  }
}

export function createStage(canvas, { tierOverride = null, onReady = () => {}, onRelease = () => {}, onFail = () => {}, onContextLost = () => {} } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL 2 is not available');
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x090909, 1);

  const tier = Object.hasOwn(TIER_SETTINGS, tierOverride) ? tierOverride : pickTier({ gpu: gpuName(gl), cores: navigator.hardwareConcurrency || 4, width: window.innerWidth });
  const { dprCap } = TIER_SETTINGS[tier];
  const compositor = createCompositor(renderer);
  const entries = new Map(); // scene index -> { status, world, ready }
  const ctx = { renderer, tier };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let lost = false;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    compositor.resize(Math.round(width * dpr), Math.round(height * dpr));
    entries.forEach((e) => e.world && e.world.resize(width, height, dpr));
  }
  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); lost = true; onContextLost(); });

  function ensure(index, name, options = {}) {
    if (lost || entries.has(index)) return;
    const entry = { status: 'loading', world: null, ready: null };
    entries.set(index, entry);
    entry.ready = (async () => {
      const load = worldLoaders[name];
      if (!load) throw new Error(`no world called "${name}"`);
      const mod = await load();
      return mod.default.create(ctx, options);
    })().then(
      (world) => {
        if (entries.get(index) !== entry) { world.dispose(); throw new Error('released before it was ready'); }
        entry.world = world;
        entry.status = 'ready';
        world.resize(width, height, dpr);
        onReady(index);
        return world;
      },
      (err) => {
        if (entries.get(index) === entry) entries.delete(index);
        onFail(index, err);
        throw err;
      },
    );
    entry.ready.catch(() => {}); // callers that care use whenReady()
  }

  function release(index) {
    const entry = entries.get(index);
    if (!entry) return;
    entries.delete(index);
    if (entry.world) { entry.world.dispose(); onRelease(index); }
  }

  function whenReady(index) {
    const entry = entries.get(index);
    return entry ? entry.ready : Promise.reject(new Error(`world ${index} was never requested`));
  }

  function guard(index, fn) {
    try { fn(); return true; } catch (err) { release(index); onFail(index, err); return false; }
  }

  function frame({ time, delta, state, pointer }) {
    if (lost) return;
    const a = entries.get(state.active);
    const b = state.next >= 0 && state.transition > 0 ? entries.get(state.next) : undefined;
    let A = a && a.status === 'ready' ? a.world : null;
    let B = b && b.status === 'ready' ? b.world : null;
    if (A && !guard(state.active, () => A.update({ time, delta, progress: state.progress, pointer, tier }))) A = null;
    if (B && !guard(state.next, () => B.update({ time, delta, progress: 0, pointer, tier }))) B = null;
    if (A && B) compositor.render(A, B, state.transition);
    else if (A) { renderer.setRenderTarget(null); renderer.render(A.scene, A.camera); }
    else if (B) { renderer.setRenderTarget(null); renderer.render(B.scene, B.camera); }
    else { renderer.setRenderTarget(null); renderer.clear(); }
  }

  return { tier, ensure, release, whenReady, frame, loaded: () => new Set(entries.keys()) };
}
