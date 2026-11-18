// The 7 named parts of Oscar's Pi 5 build, as named in pi-assembly.glb (exported from the OpenSCAD model Claude Code
// made from the official drawings). explode: how far each part moves, in mm (the model's units, CAD Z-up), when the
// assembly is fully exploded. The stack rises along +Z; the camera, its ribbon and the printed mount hang off the
// front (-Y), so they also move forward.
export const PARTS = [
  { id: 'case', label: 'Case', node: 'Case base + frame (approx)', explode: [0, 0, 0] },
  { id: 'pi5', label: 'Raspberry Pi 5', node: 'Raspberry Pi 5', explode: [0, 0, 14] },
  { id: 'hat-hardware', label: 'HAT spacers and header', node: 'HAT spacers + stacking header + PCIe FFC', explode: [0, 0, 28] },
  { id: 'ai-hat', label: 'AI HAT+', node: 'AI HAT+ 13 TOPS', explode: [0, 0, 42] },
  { id: 'mount', label: 'Camera mount (printed)', node: 'Camera mount (printed)', explode: [0, -18, 30], highlight: true },
  { id: 'camera', label: 'Camera Module 3', node: 'Camera Module 3', explode: [0, -34, 34] },
  { id: 'ribbon', label: 'Camera ribbon', node: 'Camera ribbon cable', explode: [0, -26, 38] },
];

// three.js's GLTFLoader renames nodes: whitespace becomes "_" and [ ] . : / are dropped (PropertyBinding.sanitizeNodeName).
export const meshName = (node) => node.replace(/\s/g, '_').replace(/[[\].:/]/g, '');
export const partFor = (name) => PARTS.find((p) => meshName(p.node) === name) || null;
