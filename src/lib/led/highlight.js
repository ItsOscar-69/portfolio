// Which boot.py line the code panel highlights. Most frames report their effect's rest line. An event line (the
// comets crossing, a burst of glitter, a new star, a new spark in the fire) holds the highlight for HOLD_MS, so it
// stays long enough to read at 50 frames a second.
export const HOLD_MS = 400;

export function createHighlighter(holdMs = HOLD_MS) {
  let shown = null;
  let rest = null;
  let since = -Infinity;
  return function pick(line, restLine, now) {
    if (restLine !== rest) {
      rest = restLine; // a new effect: forget the last one's event line
      shown = restLine;
      since = -Infinity;
    }
    if (line !== restLine) {
      shown = line;
      since = now;
    } else if (now - since >= holdMs) shown = restLine;
    return shown;
  };
}
