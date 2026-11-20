import * as THREE from 'three';
import { NUM_LEDS } from '../lib/led/maths.js';
import { sharedPlayer } from '../lib/led/player.js';
import { damp } from '../lib/motion.js';

// Oscar's 20-LED strip on a gentle curve, lit frame by frame by the port of his boot.py (src/lib/led/). Each LED is
// an instanced sphere in the colour boot.py computes, with a soft halo; the stage's bloom (high and mid tiers)
// adds the glow on top. The show is the page's shared player: this world drives it while the chapter is live, and
// the page's controls (src/ui/light-show.js) pick effects and pause it.
const LED_RADIUS = 0.055;
const HALO_SIZE = 0.34; // world units across a fully lit LED's halo
const STRIP_HALF_WIDTH = 2.05; // half the strip's width, ends included, for fitting it on screen
const BLOOM = { strength: 0.5, radius: 0.4, threshold: 0.3 };

const haloVertex = /* glsl */ `
attribute vec3 aColor;
uniform float uScale;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float lit = max(aColor.r, max(aColor.g, aColor.b));
  gl_PointSize = uScale * (0.3 + 0.7 * lit) / -mv.z;
  vColor = aColor;
}`;

const haloFragment = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0; // 0 at the centre, 1 at the edge
  if (r > 1.0) discard;
  float a = 1.0 - r;
  gl_FragColor = vec4(vColor * a * a * 0.6, 1.0);
}`;

// A flat ribbon following the curve: the flexible strip the LEDs are soldered to.
function ribbon(curve, height, samples = 96) {
  const positions = [];
  const index = [];
  for (let k = 0; k < samples; k++) {
    const p = curve.getPointAt(k / (samples - 1));
    positions.push(p.x, p.y - height / 2, p.z, p.x, p.y + height / 2, p.z);
    if (k > 0) {
      const a = (k - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return geometry;
}

export default {
  name: 'pico',
  async create() {
    const player = sharedPlayer();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.95, -0.05, -0.45),
      new THREE.Vector3(-1.0, 0.1, 0.05),
      new THREE.Vector3(0, 0, 0.25),
      new THREE.Vector3(1.0, -0.1, 0.05),
      new THREE.Vector3(1.95, 0.05, -0.45),
    ]);
    const along = Array.from({ length: NUM_LEDS }, (_, i) => 0.03 + (0.94 * i) / (NUM_LEDS - 1));
    const at = along.map((u) => curve.getPointAt(u));
    // The strip's front at each LED (the curve bends towards and away from you, so it isn't always +z).
    const facing = along.map((u) => {
      const t = curve.getTangentAt(u);
      return new THREE.Vector3(-t.z, 0, t.x).normalize();
    });
    const inFront = (i, d) => at[i].clone().addScaledVector(facing[i], d);

    const stripGeometry = ribbon(curve, 0.2);
    const stripMaterial = new THREE.MeshBasicMaterial({ color: '#141414', side: THREE.DoubleSide });
    const packageGeometry = new THREE.BoxGeometry(0.13, 0.13, 0.03);
    const packageMaterial = new THREE.MeshBasicMaterial({ color: '#34322e', depthWrite: false }); // no depth write, so the halo isn't clipped by a package corner
    const packages = new THREE.InstancedMesh(packageGeometry, packageMaterial, NUM_LEDS);
    packages.renderOrder = 0.5; // after the ribbon, before the halos
    const ledGeometry = new THREE.SphereGeometry(LED_RADIUS, 20, 14);
    const ledMaterial = new THREE.MeshBasicMaterial();
    const leds = new THREE.InstancedMesh(ledGeometry, ledMaterial, NUM_LEDS);
    const matrix = new THREE.Matrix4();
    const unlit = new THREE.Color(0.07, 0.07, 0.07);
    at.forEach((p, i) => {
      const onStrip = inFront(i, 0.016);
      packages.setMatrixAt(i, matrix.makeRotationY(Math.atan2(facing[i].x, facing[i].z)).setPosition(onStrip.x, onStrip.y, onStrip.z)); // turned with the strip
      const bead = inFront(i, 0.045);
      leds.setMatrixAt(i, matrix.makeTranslation(bead.x, bead.y, bead.z)); // in front of its package
      leds.setColorAt(i, unlit);
    });

    const haloPositions = new Float32Array(NUM_LEDS * 3);
    at.forEach((p, i) => {
      const glow = inFront(i, 0.05);
      haloPositions.set([glow.x, glow.y, glow.z], i * 3);
    });
    const haloColours = new Float32Array(NUM_LEDS * 3);
    const haloGeometry = new THREE.BufferGeometry();
    haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    haloGeometry.setAttribute('aColor', new THREE.BufferAttribute(haloColours, 3));
    const haloUniforms = { uScale: { value: 1 } };
    const haloMaterial = new THREE.ShaderMaterial({ vertexShader: haloVertex, fragmentShader: haloFragment, uniforms: haloUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const halos = new THREE.Points(haloGeometry, haloMaterial);
    halos.frustumCulled = false;
    halos.renderOrder = 1;

    const strip = new THREE.Group();
    strip.add(new THREE.Mesh(stripGeometry, stripMaterial), packages, leds, halos);
    strip.rotation.set(0.43, -0.5, 0); // the pose at progress 0, so the strip doesn't swing round when the chapter opens
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090909');
    scene.add(strip);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0.35, 4.6);
    camera.lookAt(0, 0, 0);

    const colour = new THREE.Color();
    const level = (v) => Math.max(0, Math.min(255, v)) / 255; // boot.py never clamps below 0
    let shownFrame = -1;
    function paint(colours) {
      colours.forEach(([r, g, b], i) => {
        const R = level(r);
        const G = level(g);
        const B = level(b);
        leds.setColorAt(i, colour.setRGB(0.07 + 0.93 * R, 0.07 + 0.93 * G, 0.07 + 0.93 * B)); // an unlit LED is a dim grey bead
        haloColours.set([R, G, B], i * 3);
      });
      leds.instanceColor.needsUpdate = true;
      haloGeometry.attributes.aColor.needsUpdate = true;
    }
    paint(player.state.colours);

    return {
      scene,
      camera,
      bloom: BLOOM,
      update({ delta, progress, pointer }) {
        const state = player.advance(delta, 'world');
        if (state.frame !== shownFrame) {
          shownFrame = state.frame;
          paint(state.colours);
        }
        const a = Math.min(1, progress / 0.6); // turned to show the curve at 0, facing you by 0.6
        const e = a * a * (3 - 2 * a);
        const turn = -0.5 * (1 - e) + pointer.x * 0.2;
        const tilt = 0.08 + 0.35 * (1 - e) + pointer.y * 0.1;
        strip.rotation.y += (turn - strip.rotation.y) * damp(0.06, delta);
        strip.rotation.x += (tilt - strip.rotation.x) * damp(0.06, delta);
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const halfH = tanHalf * camera.position.z;
        const halfW = halfH * camera.aspect;
        const fit = Math.min(1, (halfW * 0.9) / STRIP_HALF_WIDTH);
        strip.scale.setScalar(fit);
        strip.position.y = halfH * (camera.aspect < 0.8 ? 0.3 : 0.2); // keep the strip above the bottom-left title
        haloUniforms.uScale.value = (HALO_SIZE * fit * height * dpr) / (2 * tanHalf);
      },
      dispose() {
        [stripGeometry, packageGeometry, ledGeometry, haloGeometry].forEach((g) => g.dispose());
        [stripMaterial, packageMaterial, ledMaterial, haloMaterial].forEach((m) => m.dispose());
        packages.dispose();
        leds.dispose();
      },
    };
  },
};
