import * as THREE from 'three';
import { samplePolylines } from '../lib/polyline.js';
import { mulberry32 } from '../lib/rng.js';
import { particleCount } from '../lib/tier.js';
import { svgToPolylines } from './lib/svg-lines.js';

// How each stroke colour in HALCYON's body-wireframe.svg is drawn: [particle colour, density weight, depth offset].
const STROKES = {
  '#7fe9ff': ['#7fe9ff', 1.6, 0.06], // installed hardware: bright cyan, slightly in front
  '#4d7480': ['#e6f4f7', 1.0, 0.0], // chassis outline: ice white
  '#1f3a42': ['#7fb8c4', 0.45, -0.03], // cross-section contours
  '#2c4a53': ['#3d6670', 0.2, -0.06], // calibration frame and height ruler
};
const OTHER_STROKE = ['#e6f4f7', 0.6, 0.0];
const BODY_HEIGHT = 2.1; // world units
const PANEL_WIDTH = 1.15;
// Where the glass panels hang relative to the body, and how fast each drifts with scroll.
const PANEL_LAYOUT = [
  { x: -1.75, y: 0.55, z: -0.9, ry: 0.32, speed: 0.9 },
  { x: 1.7, y: -0.15, z: -1.3, ry: -0.36, speed: 0.6 },
  { x: 1.9, y: 0.95, z: -1.6, ry: -0.28, speed: 0.8 },
];

const vertexShader = /* glsl */ `
attribute vec3 aScatter;
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uAssemble;
uniform float uScale;
uniform float uScanY;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float e = uAssemble * uAssemble * (3.0 - 2.0 * uAssemble);
  vec3 p = mix(aScatter, position, e);
  float t = uTime * 0.3 + aSeed * 6.2831;
  p += vec3(sin(t + p.y * 2.3), cos(t * 0.9 + p.x * 1.9), sin(t * 0.7 + p.y)) * (0.004 + 0.05 * (1.0 - e));
  float scan = smoothstep(0.09, 0.0, abs(position.y - uScanY)) * e;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(20.0, (5.0 + 3.0 * scan) * uScale * (0.7 + aSeed * 0.6) / -mv.z);
  vColor = aColor * (0.75 + 0.25 * e) + vec3(0.5, 0.9, 1.0) * scan * 0.8;
  vAlpha = 0.45 + 0.55 * e;
}`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  gl_FragColor = vec4(vColor * vAlpha * smoothstep(0.25, 0.0, r), 1.0);
}`;

async function loadSvgText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not load ${url} (${response.status})`);
  return response.text();
}

// A screenshot drawn onto a small canvas with a soft blur, so it reads as frosted glass.
async function loadPanelTexture(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const width = 512;
  const height = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * width));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  if ('filter' in g) g.filter = 'blur(2px) saturate(1.15)'; // browsers without canvas filters get a sharp panel
  g.drawImage(img, 0, 0, width, height);
  return { texture: new THREE.CanvasTexture(canvas), aspect: height / width };
}

function makePanel({ texture, aspect }) {
  const geometry = new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_WIDTH * aspect);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const edges = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#7fe9ff', transparent: true, opacity: 0.55 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material), new THREE.LineSegments(edges, edgeMaterial));
  return {
    group,
    dispose() { geometry.dispose(); material.dispose(); texture.dispose(); edges.dispose(); edgeMaterial.dispose(); },
  };
}

export default {
  name: 'halcyon',
  async create(stage, options = {}) {
    if (!options.svg) throw new Error('the halcyon world needs options.svg');
    const shape = svgToPolylines(await loadSvgText(options.svg));
    const rng = mulberry32(options.seed ?? 11);
    const lines = shape.polylines.map(({ stroke, points }) => {
      const [hex, weight, z] = STROKES[stroke] || OTHER_STROKE;
      const c = new THREE.Color(hex);
      return { points, weight, z, color: [c.r, c.g, c.b] };
    });
    const count = particleCount(36000, stage.tier);
    const sampled = samplePolylines(lines, count, rng);
    if (!sampled.count) throw new Error(`${options.svg} has no stroked lines to turn into particles`);

    const k = BODY_HEIGHT / shape.height;
    const positions = new Float32Array(count * 3);
    const scatter = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (sampled.positions[i * 2] - shape.width / 2) * k;
      positions[i * 3 + 1] = -(sampled.positions[i * 2 + 1] - shape.height / 2) * k;
      positions[i * 3 + 2] = lines[sampled.lines[i]].z + (rng() - 0.5) * 0.05;
      scatter[i * 3] = (rng() * 2 - 1) * 3;
      scatter[i * 3 + 1] = (rng() * 2 - 1) * 2;
      scatter[i * 3 + 2] = (rng() * 2 - 1) * 2.5;
      seeds[i] = rng();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(sampled.colors, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const uniforms = { uTime: { value: 0 }, uAssemble: { value: 0 }, uScale: { value: 1 }, uScanY: { value: 0 } };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    const body = new THREE.Group();
    body.add(points);

    // Panels are decoration: one that fails to load is skipped, not fatal.
    const results = await Promise.allSettled((options.panels || []).slice(0, PANEL_LAYOUT.length).map(loadPanelTexture));
    const panels = [];
    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') { console.warn(`[halcyon] panel ${options.panels[i]} failed to load; skipping it.`); return; }
      const panel = makePanel(result.value);
      const at = PANEL_LAYOUT[i];
      panel.group.position.set(at.x, at.y, at.z);
      panel.group.rotation.y = at.ry;
      panel.layout = at;
      panels.push(panel);
    });
    const panelGroup = new THREE.Group();
    panels.forEach((panel) => panelGroup.add(panel.group));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1a1f');
    scene.add(panelGroup, body);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.4);
    const bodyHalfWidth = (shape.width / 2) * k;

    return {
      scene,
      camera,
      update({ time, progress, pointer }) {
        uniforms.uTime.value = time;
        uniforms.uAssemble.value = Math.min(1, progress / 0.6); // scattered at 0, settled by 0.6
        uniforms.uScanY.value = BODY_HEIGHT / 2 - ((time * 0.12) % 1) * BODY_HEIGHT;
        body.rotation.y += (pointer.x * 0.3 - body.rotation.y) * 0.05;
        body.rotation.x += (pointer.y * 0.1 - body.rotation.x) * 0.05;
        panels.forEach((panel, i) => {
          panel.group.position.y = panel.layout.y + (progress - 0.5) * 1.8 * panel.layout.speed + Math.sin(time * 0.4 + i * 2) * 0.04;
        });
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = dpr * (height / 900);
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const halfW = halfH * camera.aspect;
        body.scale.setScalar(Math.min(1, (halfW * 0.9) / (bodyHalfWidth + 0.05), (halfH * 0.92) / (BODY_HEIGHT / 2)));
        body.position.y = camera.aspect < 0.8 ? 0.22 : 0;
        body.position.x = camera.aspect > 1.2 ? halfW * 0.3 : 0; // keep the bottom-left title clear on wide screens
        panelGroup.visible = camera.aspect > 0.8; // phones: just the body
        panelGroup.scale.setScalar(Math.min(1, camera.aspect / 1.6));
      },
      dispose() {
        geometry.dispose();
        material.dispose();
        panels.forEach((panel) => panel.dispose());
      },
    };
  },
};
