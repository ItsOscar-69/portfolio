// Compresses the Pi 5 build (raw/pi/baseline_assembly.glb) for the site: meshopt compression with quantised geometry
// (spec §7), all 7 named parts kept. Full detail lands well under the 1.5 MB target, so nothing is simplified.
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { PARTS } from '../src/lib/pi-parts.js';

const SRC = 'raw/pi/baseline_assembly.glb';
const OUT = 'public/projects/ascii-mirror/pi-assembly.glb';
const LIMIT = 1.5 * 1024 * 1024;

if (!fs.existsSync(SRC)) throw new Error(`${SRC} is missing (it is gitignored; npm run media copies it there), so nothing was changed`);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(SRC);
await doc.transform(dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const names = doc.getRoot().listNodes().map((n) => n.getName());
const missing = PARTS.filter((p) => !names.includes(p.node)).map((p) => p.node);
if (missing.length) throw new Error(`${SRC} is missing parts: ${missing.join(', ')}`);
await io.write(OUT, doc);
const bytes = fs.statSync(OUT).size;
if (bytes > LIMIT) throw new Error(`${OUT} is ${bytes} bytes, over the 1.5 MB target`);
console.log(`wrote ${OUT}: ${Math.round(bytes / 1024)} KB, ${names.length} parts`);
