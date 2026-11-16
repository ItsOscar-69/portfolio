import * as THREE from 'three';

// Text painted around an open, double-sided cylinder: reads normally on the front, mirrored on the back.
export async function createTextRing({ text = 'BUILT WITH CLAUDE CODE · ', radius = 2.4, height = 0.5, font = '300 96px "Hanken Grotesk"' } = {}) {
  if (document.fonts) await document.fonts.load(font).catch(() => {});
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = Math.round(canvas.width / ((2 * Math.PI * radius) / height)); // keep letters unstretched
  const g = canvas.getContext('2d');
  g.font = font;
  const repeats = Math.max(1, Math.round(canvas.width / g.measureText(text).width));
  const line = text.repeat(repeats);
  const scaleX = canvas.width / g.measureText(line).width; // close the loop exactly
  g.setTransform(scaleX, 0, 0, 1, 0, 0);
  g.font = font;
  g.fillStyle = '#ffffff';
  g.textBaseline = 'middle';
  g.fillText(line, 0, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 160, 1, true);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = 0.16;
  return { mesh, material, dispose() { geometry.dispose(); material.dispose(); texture.dispose(); } };
}
