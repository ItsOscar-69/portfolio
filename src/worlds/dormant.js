import * as THREE from 'three';

const COLS = { high: 160, mid: 110, low: 70 };

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uPointer;
uniform float uScale;
varying float vAlpha;
void main() {
  vec3 p = position;
  float glow = smoothstep(1.4, 0.0, distance(p.xy, uPointer));
  float breathe = 0.5 + 0.5 * sin(uTime * 0.7 - length(p.xy) * 0.8);
  p.z += glow * 0.3;
  vAlpha = 0.05 + 0.16 * breathe + 0.55 * glow;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.6 + 2.4 * glow) * uScale;
}`;

const fragmentShader = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  if (dot(d, d) > 0.25) discard;
  gl_FragColor = vec4(vec3(0.957, 0.957, 0.949) * vAlpha, 1.0);
}`;

export default {
  name: 'dormant',
  async create(stage) {
    const cols = COLS[stage.tier] || COLS.mid;
    const rows = Math.round(cols * 0.62);
    const positions = new Float32Array(cols * rows * 3);
    let k = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        positions[k++] = (x / (cols - 1) - 0.5) * 9;
        positions[k++] = (y / (rows - 1) - 0.5) * 5.6;
        positions[k++] = 0;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const uniforms = { uTime: { value: 0 }, uPointer: { value: new THREE.Vector2(99, 99) }, uScale: { value: 1 } };
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090909');
    scene.add(points);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 0, 6);
    const target = new THREE.Vector2(99, 99);
    const halfH = Math.tan(THREE.MathUtils.degToRad(22.5)) * 6;

    return {
      scene,
      camera,
      update({ time, pointer }) {
        uniforms.uTime.value = time;
        target.set(pointer.x * halfH * camera.aspect, -pointer.y * halfH);
        uniforms.uPointer.value.lerp(target, 0.12);
      },
      resize(width, height, dpr) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        uniforms.uScale.value = dpr;
      },
      dispose() { geometry.dispose(); material.dispose(); },
    };
  },
};
