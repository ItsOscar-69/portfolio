import { it, expect } from 'vitest';
import fs from 'node:fs';
import { PARTS, meshName, partFor } from '../../src/lib/pi-parts.js';

const glb = fs.readFileSync('public/projects/ascii-mirror/pi-assembly.glb');
const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));

it('is the compressed Pi build: 1.5 MB or less, meshopt-compressed with quantised geometry', () => {
  expect(glb.readUInt32LE(0)).toBe(0x46546c67); // "glTF"
  expect(glb.length).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  expect(json.extensionsUsed).toEqual(expect.arrayContaining(['EXT_meshopt_compression', 'KHR_mesh_quantization']));
});

it('keeps all 7 named parts, and the parts table matches them exactly', () => {
  expect(json.nodes.map((n) => n.name).sort()).toEqual(PARTS.map((p) => p.node).sort());
  expect(PARTS.filter((p) => p.highlight).map((p) => p.id)).toEqual(['mount']);
});

it('finds each part by the name three.js gives it', () => {
  expect(meshName('Camera mount (printed)')).toBe('Camera_mount_(printed)');
  expect(meshName('AI HAT+ 13 TOPS')).toBe('AI_HAT+_13_TOPS');
  for (const part of PARTS) expect(partFor(meshName(part.node))).toBe(part);
  expect(partFor('Something_else')).toBeNull();
});
