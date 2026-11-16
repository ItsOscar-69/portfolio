// Copies the original project files into raw/ (gitignored). Paths live in sources.local.json.
import fs from 'node:fs/promises';
import path from 'node:path';

const config = JSON.parse(await fs.readFile('sources.local.json', 'utf8'));
const copies = [
  [path.join(config.halcyon, 'index.html'), 'raw/halcyon/index.html'],
  [path.join(config.halcyon, 'styles.css'), 'raw/halcyon/styles.css'],
  [path.join(config.halcyon, 'main.js'), 'raw/halcyon/main.js'],
  [path.join(config.halcyon, 'boot-gate.js'), 'raw/halcyon/boot-gate.js'],
  [path.join(config.halcyon, 'assets', 'body-wireframe.svg'), 'raw/halcyon/assets/body-wireframe.svg'],
  [path.join(config.tee, 'DEAD TIRED - on black shirt.jpg'), 'raw/tee/on-black.jpg'],
  [path.join(config.tee, 'DEAD TIRED - tee mockup.jpg'), 'raw/tee/mockup.jpg'],
  [path.join(config.tee, 'DEAD TIRED - alternative with stump.jpg'), 'raw/tee/alt-stump.jpg'],
  [path.join(config.tee, 'DEAD TIRED - print file (transparent).png'), 'raw/tee/print.png'],
  [config.pico, 'raw/pico/boot.py'],
  [path.join(config.pi, 'export', 'baseline_assembly.glb'), 'raw/pi/baseline_assembly.glb'],
  [path.join(config.pi, 'README.md'), 'raw/pi/README.md'],
];
const layerDir = path.join(config.tee, 'Layers (PNG)');
for (const name of await fs.readdir(layerDir)) {
  if (name.toLowerCase().endsWith('.png')) copies.push([path.join(layerDir, name), path.join('raw/tee/layers', name)]);
}
for (const [from, to] of copies) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
  console.log(`copied ${path.basename(from)} -> ${to}`);
}
