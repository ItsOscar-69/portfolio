// Turns every stroked shape in an SVG into a polyline (points in the SVG's own units),
// using the browser's SVG geometry API. Fill-only shapes and text are skipped.
const SHAPES = 'path, line, polyline, polygon, circle, ellipse, rect';

function strokeOf(el) {
  for (let node = el; node && node.nodeType === 1; node = node.parentNode) {
    const stroke = node.getAttribute('stroke');
    if (stroke && stroke !== 'none') return stroke.toLowerCase();
  }
  return null;
}

export function svgToPolylines(svgText, { step = 1.5 } = {}) {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.nodeName !== 'svg') throw new Error('not an SVG document');

  // Geometry methods need the SVG in a live document; attach it invisibly, then remove it.
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  host.appendChild(document.importNode(root, true));
  document.body.appendChild(host);
  try {
    const svg = host.firstElementChild;
    const box = svg.viewBox && svg.viewBox.baseVal;
    const width = (box && box.width) || Number(svg.getAttribute('width')) || 1;
    const height = (box && box.height) || Number(svg.getAttribute('height')) || 1;
    const polylines = [];
    for (const el of svg.querySelectorAll(SHAPES)) {
      const stroke = strokeOf(el);
      if (!stroke) continue;
      const length = el.getTotalLength();
      if (!(length > 0)) continue;
      const n = Math.max(2, Math.ceil(length / step));
      // A moveto inside a path makes consecutive samples jump; split there so no particles fill the gap.
      let run = [];
      const flush = () => {
        if (run.length >= 4) polylines.push({ stroke, points: Float32Array.from(run) });
        run = [];
      };
      for (let i = 0; i < n; i++) {
        const p = el.getPointAtLength((i / (n - 1)) * length);
        const last = run.length;
        if (last && Math.hypot(p.x - run[last - 2], p.y - run[last - 1]) > step * 4) flush();
        run.push(p.x, p.y);
      }
      flush();
    }
    return { width, height, polylines };
  } finally {
    host.remove();
  }
}
