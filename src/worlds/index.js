import * as THREE from 'three';
import { mulberry32 } from '../lib/rng.js';
import { particleCount } from '../lib/tier.js';
import { createTextRing } from './lib/ring.js';

// One colour per chapter world: HALCYON ice/teal, ASCII green, Pico rainbow, DEAD TIRED red/bone.
const PALETTE = ['#e6f4f7', '#7fb8c4', '#39ff88', '#ff3b6b', '#ffb020', '#39d0ff', '#8c1f25', '#bca775'];

const vertexShader = /* glsl */ `
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uProgress;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float t = uTime * 0.18 + aSeed * 6.2831;
  p += vec3(sin(t + p.y * 0.9), cos(t * 0.7 + p.x * 0.6), sin(t * 0.5 + p.z)) * 0.18;
  p.z += uProgress * uProgress * (3.0 + aSeed * 7.0); // stream toward the camera on the way out
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(28.0, (2.0 + aSeed * 5.0) * uScale * (6.0 / -mv.z));
  vColor = aColor;
  vAlpha = 0.5 * smoothstep(0.2, 1.5, -mv.z);
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

function gauss(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export default {
  name: 'index',
  async create(stage) {
    const rng = mulberry32(2026);
    const count = particleCount(40000, stage.tier);
    const blobs = PALETTE.map((hex) => ({
      color: new THREE.Color(hex),
      center: new THREE.Vector3((rng() * 2 - 1) * 3.4, (rng() * 2 - 1) * 1.8, -rng() * 3),
      spread: 0.7 + rng() * 0.8,
    }));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const b = blobs[Math.floor(rng() * blobs.length)];
      positions[i * 3] = b.center.x + gauss(rng) * b.spread * 1.3;
      positions[i * 3 + 1] = b.center.y + gauss(rng) * b.spread * 0.8;
      positions[i * 3 + 2] = b.center.z + gauss(rng) * b.spread;
      const shade = 0.55 + rng() * 0.45;
      colors[i * 3] = b.color.r * shade;
      colors[i * 3 + 1] = b.color.g * shade;
      colors[i * 3 + 2] = b.color.b * shade;
      seeds[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const uniforms = { uTime: { value: 0 }, uProgress: { value: 0 }, uScale: { value: 1 } };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const cloud = new THREE.Points(geometry, material);
    cloud.frustumCulled = false;

    const ring = await createTextRing();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090909');
    scene.add(cloud, ring.mesh);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    return {
      scene,
      camera,
      update({ time, progress, pointer }) {
        uniforms.uTime.value = time;
        uniforms.uProgress.value = progress;
        ring.mesh.rotation.y = -(time * 0.22 + progress * 2.4); // text slides right-to-left like a marquee
        ring.mesh.position.z = progress * 2.5;
        ring.material.opacity = 1 - progress * 0.7;
        camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.04;
        camera.position.y += (-pointer.y * 0.2 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = dpr * (height / 900);
        ring.mesh.scale.setScalar(Math.max(0.55, Math.min(1, camera.aspect / 1.2)));
      },
      dispose() { geometry.dispose(); material.dispose(); ring.dispose(); },
    };
  },
};
