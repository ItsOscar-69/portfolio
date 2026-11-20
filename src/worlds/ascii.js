import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RAMP, INK, PAPER, HOT, CELL_PX, gridFor } from '../lib/ascii.js';
import { PARTS, partFor } from '../lib/pi-parts.js';
import { mirror } from '../lib/camera.js';
import { damp } from '../lib/motion.js';
import { glyphAtlas } from './lib/glyphs.js';

// The ASCII Mirror chapter (spec §4.3): Oscar's Pi 5 build, drawn as green ASCII. Each frame the model is rendered
// small, one pixel per character cell, and a full-screen pass swaps every cell for a ramp character by brightness.
// Scrolling explodes the stack. The printed camera mount is drawn with a green tint, which the pass shows as
// near-white characters. While the visitor's mirror is on (src/ui/mirror.js), the webcam feeds the same pass.

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tVideo;
uniform sampler2D tGlyphs;
uniform vec2 uGrid;
uniform float uUseVideo;
uniform vec2 uVideoScale;
uniform float uLevels;
uniform vec3 uInk;
uniform vec3 uHot;
uniform vec3 uPaper;
varying vec2 vUv;
void main() {
  vec2 cell = floor(vUv * uGrid);
  vec2 inCell = fract(vUv * uGrid);
  vec2 at = (cell + 0.5) / uGrid;
  float lum;
  float hot = 0.0;
  if (uUseVideo > 0.5) {
    vec2 v = (vec2(1.0 - at.x, at.y) - 0.5) * uVideoScale + 0.5; // mirrored like a selfie, cover-fitted
    lum = dot(texture2D(tVideo, v).rgb, vec3(0.2126, 0.7152, 0.0722));
  } else {
    vec4 s = texture2D(tScene, at);
    lum = max(s.r, max(s.g, s.b));
    hot = clamp((s.g - s.b) * 3.0, 0.0, 1.0); // only the mount is tinted green
  }
  float index = min(uLevels - 1.0, floor(lum * uLevels));
  float ink = texture2D(tGlyphs, vec2((index + inCell.x) / uLevels, inCell.y)).r;
  gl_FragColor = vec4(mix(uPaper, mix(uInk, uHot, hot), ink), 1.0);
}`;

export default {
  name: 'ascii',
  async create(stage, options = {}) {
    if (!options.model) throw new Error('the ascii world needs options.model');
    const [gltf, glyphs] = await Promise.all([new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(options.model), glyphAtlas()]);

    const grey = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, flatShading: true, roughness: 0.8, metalness: 0 });
    const tinted = new THREE.MeshStandardMaterial({ color: 0x66ff66, flatShading: true, roughness: 0.8, metalness: 0 });
    const parts = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const part = partFor(o.name);
      o.material = part && part.highlight ? tinted : grey;
      // Quantised parts carry their own position and scale, so the explode adds to the base position.
      if (part) parts.push({ object: o, base: o.position.clone(), offset: new THREE.Vector3(...part.explode) });
    });
    if (parts.length !== PARTS.length) throw new Error(`${options.model} has ${parts.length} of the ${PARTS.length} named parts`);

    const box = new THREE.Box3().setFromObject(gltf.scene);
    gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
    const model = new THREE.Group();
    model.rotation.x = -Math.PI / 2; // the CAD model is Z-up; three.js is Y-up, and the camera side then faces you
    model.scale.setScalar(2 / box.getSize(new THREE.Vector3()).length());
    model.add(gltf.scene);
    const pivot = new THREE.Group();
    pivot.add(model);
    pivot.rotation.set(0.3, -0.6, 0); // the pose at progress 0, so it doesn't swing round when the chapter opens

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(2, 3, 4);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.add(pivot, new THREE.HemisphereLight(0xffffff, 0x202020, 1.1), sun);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 4.2);

    const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    blank.needsUpdate = true;
    const uniforms = {
      tScene: { value: target.texture },
      tVideo: { value: blank },
      tGlyphs: { value: glyphs },
      uGrid: { value: new THREE.Vector2(1, 1) },
      uUseVideo: { value: 0 },
      uVideoScale: { value: new THREE.Vector2(1, 1) },
      uLevels: { value: RAMP.length },
      uInk: { value: new THREE.Color(INK) },
      uHot: { value: new THREE.Color(HOT) },
      uPaper: { value: new THREE.Color(PAPER) },
    };
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const quad = new THREE.Mesh(quadGeometry, quadMaterial);
    quad.frustumCulled = false;
    const screen = new THREE.Scene();
    screen.add(quad);
    const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const { renderer } = stage;
    let aspect = 1;
    let videoTexture = null;
    let videoFor = null;

    return {
      scene: screen,
      camera: flat,
      update({ delta, progress, pointer }) {
        const video = mirror.video;
        if (video !== videoFor) {
          if (videoTexture) videoTexture.dispose();
          videoTexture = video ? new THREE.VideoTexture(video) : null;
          videoFor = video;
        }
        const live = Boolean(videoTexture && video.readyState >= 2 && video.videoWidth);
        uniforms.uUseVideo.value = live ? 1 : 0;
        uniforms.tVideo.value = live ? videoTexture : blank;
        if (live) {
          const videoAspect = video.videoWidth / video.videoHeight;
          uniforms.uVideoScale.value.set(Math.min(1, aspect / videoAspect), Math.min(1, videoAspect / aspect));
          return; // the webcam replaces the model: nothing to render into the target
        }
        const a = Math.min(1, progress / 0.7); // assembled at 0, fully exploded by 0.7
        const e = a * a * (3 - 2 * a);
        for (const part of parts) part.object.position.copy(part.base).addScaledVector(part.offset, e);
        const turn = -0.6 + progress * 1.1 + pointer.x * 0.25;
        const tilt = 0.3 + pointer.y * 0.12;
        pivot.rotation.y += (turn - pivot.rotation.y) * damp(0.08, delta);
        pivot.rotation.x += (tilt - pivot.rotation.x) * damp(0.08, delta);
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
      },
      resize(width, height) {
        const { cols, rows } = gridFor(width, height, CELL_PX);
        target.setSize(cols, rows);
        uniforms.uGrid.value.set(cols, rows);
        aspect = width / height;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        const halfW = halfH * aspect;
        pivot.scale.setScalar(Math.min(1, (halfW * 1.0) / 1.2, (halfH * 0.85) / 1.2));
        pivot.position.x = aspect > 1.2 ? halfW * 0.3 : 0; // keep the bottom-left title clear on wide screens
        pivot.position.y = aspect < 0.8 ? halfH * 0.25 : 0; // phones: above the title
      },
      dispose() {
        gltf.scene.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
        [grey, tinted, quadMaterial].forEach((m) => m.dispose());
        [target, glyphs, blank, quadGeometry].forEach((x) => x.dispose());
        if (videoTexture) videoTexture.dispose();
      },
    };
  },
};
