import * as THREE from 'three';
import { samplePoints } from '../lib/sample.js';
import { mulberry32 } from '../lib/rng.js';
import { particleCount } from '../lib/tier.js';
import { damp } from '../lib/motion.js';

const vertexShader = /* glsl */ `
attribute vec3 aScatter;
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uAssemble;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float e = uAssemble * uAssemble * (3.0 - 2.0 * uAssemble);
  vec3 p = mix(aScatter, position, e);
  float t = uTime * 0.35 + aSeed * 6.2831;
  p += vec3(sin(t + p.y * 2.1), cos(t * 0.8 + p.x * 1.7), sin(t * 0.6 + p.x * 1.3 + p.y)) * (0.01 + 0.06 * (1.0 - e));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(24.0, 9.0 * uScale * (0.6 + aSeed * 0.8) / -mv.z);
  vColor = aColor;
  vAlpha = 0.5 + 0.5 * e;
}`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  gl_FragColor = vec4(vColor, vAlpha * (1.0 - smoothstep(0.05, 0.25, r)));
}`;

export async function loadImageData(url, maxSide = 240) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  return g.getImageData(0, 0, w, h);
}

export default {
  name: 'picture',
  async create(stage, options = {}) {
    if (!options.cover) throw new Error('the picture world needs a cover image');
    const image = await loadImageData(options.cover);
    const rng = mulberry32(options.seed ?? 7);
    const count = particleCount(60000, stage.tier);
    const sampled = samplePoints(image, count, rng, { minLuma: options.minLuma ?? 0.08 });
    if (!sampled.count) throw new Error(`cover ${options.cover} has no visible pixels to turn into particles`);

    const palette = (options.palette || []).map((hex) => new THREE.Color(hex));
    const scatter = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      scatter[i * 3] = (rng() * 2 - 1) * 3.2;
      scatter[i * 3 + 1] = (rng() * 2 - 1) * 2.2;
      scatter[i * 3 + 2] = (rng() * 2 - 1) * 2.5;
      seeds[i] = rng();
      if (palette.length) {
        const c = palette[i % palette.length];
        sampled.colors[i * 3] = sampled.colors[i * 3] * 0.65 + c.r * 0.35;
        sampled.colors[i * 3 + 1] = sampled.colors[i * 3 + 1] * 0.65 + c.g * 0.35;
        sampled.colors[i * 3 + 2] = sampled.colors[i * 3 + 2] * 0.65 + c.b * 0.35;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(sampled.positions, 3));
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(sampled.colors, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const uniforms = { uTime: { value: 0 }, uAssemble: { value: 0 }, uScale: { value: 1 } };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    const group = new THREE.Group();
    group.add(points);
    group.position.y = 0.12;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(options.background || '#090909');
    scene.add(group);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.4);

    return {
      scene,
      camera,
      update({ time, delta, progress, pointer }) {
        uniforms.uTime.value = time;
        uniforms.uAssemble.value = Math.min(1, progress / 0.6); // scattered at 0, settled by 0.6
        group.rotation.y += (pointer.x * 0.25 - group.rotation.y) * damp(0.05, delta);
        group.rotation.x += (pointer.y * 0.12 - group.rotation.x) * damp(0.05, delta);
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = dpr * (height / 900);
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const halfW = halfH * camera.aspect;
        group.scale.setScalar(Math.min(1, (halfW * 0.86) / sampled.extent.x, (halfH * 0.78) / sampled.extent.y));
      },
      dispose() { geometry.dispose(); material.dispose(); },
    };
  },
};
