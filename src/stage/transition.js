import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float uT;
varying vec2 vUv;
vec3 zoom(sampler2D tex, vec2 uv, float strength) {
  vec2 dir = uv - 0.5;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float k = float(i) / 15.0;
    acc += texture2D(tex, uv - dir * strength * k).rgb;
  }
  return acc / 16.0;
}
void main() {
  float pulse = sin(3.14159265 * uT);
  float strength = pulse * 0.45;
  float m = smoothstep(0.3, 0.7, uT);
  vec3 col = mix(zoom(tFrom, vUv, strength), zoom(tTo, vUv, strength), m);
  col += pulse * 0.06;
  gl_FragColor = vec4(col, 1.0);
}`;

const copyShader = /* glsl */ `
uniform sampler2D tFrom;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(tFrom, vUv).rgb, 1.0);
}`;

// Renders worlds to textures and puts them on screen. render() blends two with a radial zoom-blur that peaks
// halfway. single() draws one world through a texture. Both run post(world, target) on each world's texture first;
// the stage uses it for bloom.
export function createCompositor(renderer) {
  const rtA = new THREE.WebGLRenderTarget(1, 1);
  const rtB = new THREE.WebGLRenderTarget(1, 1);
  const blend = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { tFrom: { value: rtA.texture }, tTo: { value: rtB.texture }, uT: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });
  const copy = new THREE.ShaderMaterial({ vertexShader, fragmentShader: copyShader, uniforms: { tFrom: { value: rtA.texture } }, depthTest: false, depthWrite: false });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(geometry, blend);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const toTexture = (world, target, post) => {
    renderer.setRenderTarget(target);
    renderer.render(world.scene, world.camera);
    post(world, target);
  };
  const toScreen = (material) => {
    quad.material = material;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  };

  return {
    resize(width, height) { rtA.setSize(width, height); rtB.setSize(width, height); },
    render(from, to, t, post = () => {}) {
      toTexture(from, rtA, post);
      toTexture(to, rtB, post);
      blend.uniforms.uT.value = t;
      toScreen(blend);
    },
    single(world, post = () => {}) {
      toTexture(world, rtA, post);
      toScreen(copy);
    },
    dispose() { rtA.dispose(); rtB.dispose(); blend.dispose(); copy.dispose(); geometry.dispose(); },
  };
}
