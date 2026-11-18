import * as THREE from 'three';
import { RAMP } from '../../lib/ascii.js';

// A texture with the ramp's characters side by side, white on black, in the site's JetBrains Mono. Only weight 400
// is bundled. It waits for that font, so a poster never catches the fallback face.
export async function glyphAtlas(doc = document) {
  const font = '400 56px "JetBrains Mono"';
  if (doc.fonts) {
    try { await doc.fonts.load(font); } catch { /* the monospace fallback below still works */ }
  }
  const canvas = doc.createElement('canvas');
  canvas.width = 64 * RAMP.length;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#fff';
  g.font = `${font}, monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  [...RAMP].forEach((ch, i) => g.fillText(ch, i * 64 + 32, 34));
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}
