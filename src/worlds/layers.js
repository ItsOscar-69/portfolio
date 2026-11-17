import * as THREE from 'three';
import { mulberry32 } from '../lib/rng.js';
import { particleCount } from '../lib/tier.js';
import { parseLayerManifest } from '../lib/layer-manifest.js';

// An "exploded print": a design's layers float apart along Z and slide together into the finished piece.
const STACK_HEIGHT = 2.0; // world units for the full canvas height
const SPREAD = 0.24; // gap between neighbouring layers when fully exploded (larger pushes the front layers into the camera)
const DEFAULT_DUST = ['#bca775', '#8c1f25'];
const HEX = /^#[0-9a-f]{6}$/i;

const dustVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float t = uTime * 0.12 + aSeed * 6.2831;
  p.y = mod(p.y + uTime * (0.03 + aSeed * 0.05) + 1.6, 3.2) - 1.6; // slow upward drift, wrapping
  p.x += sin(t) * 0.08;
  p.z += cos(t * 0.8) * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.5 + aSeed * 2.5) * uScale;
  vColor = aColor;
  vAlpha = 0.25 + aSeed * 0.5;
}`;

const dustFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  gl_FragColor = vec4(vColor, vAlpha * (1.0 - smoothstep(0.0, 0.25, r)));
}`;

async function loadManifest(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not load ${url} (${response.status})`);
  return parseLayerManifest(await response.json());
}

async function loadTexture(url) {
  const texture = await new THREE.TextureLoader().loadAsync(url);
  texture.anisotropy = 4;
  return texture;
}

export default {
  name: 'layers',
  async create(stage, options = {}) {
    if (!options.manifest) throw new Error('the layers world needs options.manifest');
    const manifest = await loadManifest(options.manifest);
    const folder = options.manifest.slice(0, options.manifest.lastIndexOf('/') + 1);
    // Every layer is part of the design: if one fails, the whole world fails and the poster shows the finished print.
    const textures = await Promise.all(manifest.layers.map((layer) => (layer.file ? loadTexture(folder + layer.file) : null)));

    const k = STACK_HEIGHT / manifest.height;
    const stack = new THREE.Group();
    stack.rotation.set(0.18, -0.6, 0); // start in the exploded pose, so the stack doesn't swing round when the chapter opens
    const edgeMaterial = new THREE.LineBasicMaterial({ color: '#bca775', transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    // Image layers draw strictly back to front (renderOrder, no depth test), so co-planar layers never z-fight when compressed.
    // Flat-colour layers (the shirt) are opaque and do write depth, so dust behind the shirt is hidden while dust in front shows.
    const parts = manifest.layers.map((layer, i) => {
      const geometry = new THREE.PlaneGeometry(layer.w * k, layer.h * k);
      const material = layer.file
        ? new THREE.MeshBasicMaterial({ map: textures[i], transparent: true, depthTest: false, depthWrite: false })
        : new THREE.MeshBasicMaterial({ color: layer.fill });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = i * 2;
      const edges = new THREE.EdgesGeometry(geometry);
      const outline = new THREE.LineSegments(edges, edgeMaterial);
      outline.renderOrder = i * 2 + 1;
      const layerGroup = new THREE.Group();
      layerGroup.position.set((layer.x + layer.w / 2 - manifest.width / 2) * k, -(layer.y + layer.h / 2 - manifest.height / 2) * k, 0);
      layerGroup.add(mesh, outline);
      stack.add(layerGroup);
      return { group: layerGroup, geometry, material, edges, texture: textures[i] };
    });
    const mid = (parts.length - 1) / 2;

    const palette = (Array.isArray(options.palette) ? options.palette.filter((c) => HEX.test(c)) : []).map((hex) => new THREE.Color(hex));
    const colors = palette.length ? palette : DEFAULT_DUST.map((hex) => new THREE.Color(hex));
    const rng = mulberry32(options.seed ?? 1543);
    const count = particleCount(5000, stage.tier);
    const positions = new Float32Array(count * 3);
    const dustColors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() * 2 - 1) * 2.4;
      positions[i * 3 + 1] = (rng() * 2 - 1) * 1.6;
      positions[i * 3 + 2] = (rng() * 2 - 1) * 1.4;
      const c = colors[i % colors.length];
      dustColors.set([c.r, c.g, c.b], i * 3);
      seeds[i] = rng();
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeometry.setAttribute('aColor', new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const dustUniforms = { uTime: { value: 0 }, uScale: { value: 1 } };
    const dustMaterial = new THREE.ShaderMaterial({ vertexShader: dustVertex, fragmentShader: dustFragment, uniforms: dustUniforms, transparent: true, depthWrite: false });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.frustumCulled = false;
    dust.renderOrder = parts.length * 2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(HEX.test(options.background || '') ? options.background : '#161616');
    scene.add(stack, dust);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.6);
    const stackHalfWidth = (manifest.width / 2) * k;

    return {
      scene,
      camera,
      update({ time, progress, pointer }) {
        const a = Math.min(1, progress / 0.7); // apart at 0, flat and face-on by 0.7
        const e = a * a * (3 - 2 * a);
        parts.forEach((part, i) => { part.group.position.z = (i - mid) * SPREAD * (1 - e); });
        edgeMaterial.opacity = 0.35 * (1 - e);
        const targetY = -0.6 * (1 - e) + pointer.x * 0.2;
        const targetX = 0.18 * (1 - e) + pointer.y * 0.1;
        stack.rotation.y += (targetY - stack.rotation.y) * 0.08;
        stack.rotation.x += (targetX - stack.rotation.x) * 0.08;
        dustUniforms.uTime.value = time;
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        dustUniforms.uScale.value = dpr * (height / 900);
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const halfW = halfH * camera.aspect;
        const lift = camera.aspect < 0.8 ? 0.25 : 0; // phones: raise the print clear of the title
        stack.scale.setScalar(Math.min(1, (halfW * (camera.aspect < 0.8 ? 0.74 : 0.9)) / (stackHalfWidth + 0.05), (halfH * 0.9 - lift) / (STACK_HEIGHT / 2)));
        stack.position.y = lift;
        stack.position.x = camera.aspect > 1.2 ? halfW * 0.3 : 0; // keep the bottom-left title clear on wide screens
      },
      dispose() {
        parts.forEach((part) => {
          part.geometry.dispose();
          part.material.dispose();
          part.edges.dispose();
          if (part.texture) part.texture.dispose();
        });
        edgeMaterial.dispose();
        dustGeometry.dispose();
        dustMaterial.dispose();
      },
    };
  },
};
