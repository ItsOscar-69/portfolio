import { PARTS, partFor } from '../lib/pi-parts.js';

// Tints for the normal-shaded view, near the real parts' colours so the list is easy to match up.
const TINTS = { case: '#d8d3ca', pi5: '#2f6a3c', 'hat-hardware': '#c8b16a', 'ai-hat': '#30343b', mount: '#8fd8b0', camera: '#3f6b4c', ribbon: '#d2b47c' };
const HIGHLIGHT = '#39ff88';

// The content panel's 3D viewer (spec §4.3): the Pi build, normally shaded, that you turn by dragging, with a list
// of its 7 parts. Hovering or focusing a part highlights it; clicking or tapping pins it.
// - Each viewer has its own small renderer, made only when its figure first comes near the screen.
// - It never zooms on the wheel, and vertical swipes scroll the page, so it can't trap scrolling.
// - Without WebGL, or if the model fails to load, the poster and the list stay.
export function createModelViewers({ doc, reduced = false }) {
  const win = doc.defaultView;
  return Array.from(doc.querySelectorAll('.media--model[data-model]')).map((figure) => {
    const poster = figure.querySelector('img');
    const stage = doc.createElement('div');
    stage.className = 'model__stage';
    figure.insertBefore(stage, poster);
    if (poster) stage.append(poster);

    const list = doc.createElement('ul');
    list.className = 'model__parts';
    list.setAttribute('aria-label', 'Parts of the build');
    const buttons = new Map();
    let apply = () => {};
    const highlight = (id) => {
      if (id) figure.dataset.highlight = id;
      else delete figure.dataset.highlight;
      buttons.forEach((b, key) => b.classList.toggle('is-hot', key === id));
      apply(id);
    };
    let pinned = null;
    for (const part of PARTS) {
      const item = doc.createElement('li');
      const b = doc.createElement('button');
      b.type = 'button';
      b.textContent = part.label;
      b.dataset.part = part.id;
      b.setAttribute('aria-pressed', 'false');
      // Hovering or focusing shows a part for a moment. A click or tap pins it until it is pressed again, which is
      // how touch screens use the list: their pointerleave fires as soon as the finger lifts.
      b.addEventListener('pointerenter', () => highlight(part.id));
      b.addEventListener('pointerleave', () => highlight(pinned));
      b.addEventListener('focus', () => highlight(part.id));
      b.addEventListener('blur', () => highlight(pinned));
      b.addEventListener('click', () => {
        pinned = pinned === part.id ? null : part.id;
        buttons.forEach((btn, key) => btn.setAttribute('aria-pressed', String(key === pinned)));
        highlight(pinned || part.id);
      });
      item.append(b);
      list.append(item);
      buttons.set(part.id, b);
    }
    stage.after(list);

    const begin = () => mount({ figure, stage, doc, win, reduced }).then((fn) => {
      if (!fn) return;
      apply = fn;
      apply(figure.dataset.highlight || null);
    }).catch((err) => console.warn('[model viewer] the viewer failed to start; keeping the poster.', err));
    if ('IntersectionObserver' in win) {
      const near = new win.IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          near.disconnect();
          begin();
        }
      }, { rootMargin: '300px 0px' });
      near.observe(figure);
    } else begin();
    return { figure, highlight };
  });
}

// Loads three.js and the model, adds the canvas and returns the function that applies a highlight (or null).
async function mount({ figure, stage, doc, win, reduced }) {
  let THREE;
  let GLTFLoader;
  let MeshoptDecoder;
  let OrbitControls;
  try {
    [THREE, { GLTFLoader }, { MeshoptDecoder }, { OrbitControls }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js'),
      import('three/addons/controls/OrbitControls.js'),
    ]);
  } catch (err) {
    console.warn('[model viewer] three.js failed to load; keeping the poster.', err);
    return null;
  }
  const canvas = doc.createElement('canvas');
  canvas.className = 'model__canvas';
  canvas.setAttribute('aria-hidden', 'true'); // the poster's alt text describes the viewer
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.warn('[model viewer] WebGL is unavailable; keeping the poster.', err);
    return null;
  }
  THREE.ColorManagement.enabled = false; // colours pass through raw, as on the stage
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 1.5));
  let gltf;
  try {
    gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(figure.dataset.model);
  } catch (err) {
    renderer.dispose();
    console.warn('[model viewer] the model failed to load; keeping the poster.', err);
    return null;
  }

  const materials = new Map();
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const part = partFor(o.name);
    if (!part) return;
    const material = new THREE.MeshStandardMaterial({ color: TINTS[part.id], flatShading: true, roughness: 0.7, metalness: 0.05, transparent: true });
    o.material = material;
    materials.set(part.id, material);
  });
  const box = new THREE.Box3().setFromObject(gltf.scene);
  gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const model = new THREE.Group();
  model.rotation.x = -Math.PI / 2; // the CAD model is Z-up; three.js is Y-up
  model.add(gltf.scene);
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(radius * 2, radius * 3, radius * 2.5);
  const scene = new THREE.Scene();
  scene.add(model, new THREE.HemisphereLight(0xffffff, 0x303030, 1.3), sun);
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, radius / 50, radius * 20);
  camera.position.set(radius * 1.5, radius * 1.0, radius * 2.1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false; // the wheel scrolls the page
  controls.enablePan = false;
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.08;
  controls.update();
  canvas.style.touchAction = 'pan-y'; // vertical swipes scroll the page; sideways drags turn the model
  stage.append(canvas);

  let dirty = true;
  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  if ('ResizeObserver' in win) new win.ResizeObserver(resize).observe(stage);
  resize();
  controls.addEventListener('change', () => { dirty = true; });

  // Draws only when something changed, and only while the figure is on screen.
  let raf = 0;
  let lost = false;
  const loop = () => {
    if (lost) return;
    raf = win.requestAnimationFrame(loop);
    const moved = controls.update();
    if (!moved && !dirty) return;
    renderer.render(scene, camera);
    dirty = false;
    figure.classList.add('is-ready');
  };
  const run = () => { if (!raf && !lost) raf = win.requestAnimationFrame(loop); };
  const pause = () => {
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
  };
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    pause();
    figure.classList.remove('is-ready');
    console.warn('[model viewer] WebGL context lost; showing the poster.');
  });
  if ('IntersectionObserver' in win) new win.IntersectionObserver(([entry]) => (entry.isIntersecting ? run() : pause())).observe(figure);
  else run();

  return (id) => {
    materials.forEach((material, key) => {
      const on = key === id;
      material.emissive.set(on ? HIGHLIGHT : '#000000');
      material.emissiveIntensity = on ? 0.5 : 0;
      material.opacity = id && !on ? 0.28 : 1;
      material.depthWrite = !id || on;
    });
    dirty = true;
  };
}
