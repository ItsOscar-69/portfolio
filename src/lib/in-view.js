// True once an element is (almost) fully on screen: at least `minFill` of it is visible, or, for an element taller than
// the screen, the visible part fills at least `minFill` of the viewport's height. No root bounds means false.
export function isFullyInView(entry, minFill = 0.9) {
  if (!entry.rootBounds) return false;
  if (entry.intersectionRatio >= minFill) return true;
  const viewport = entry.rootBounds.height;
  return viewport > 0 && entry.intersectionRect.height >= minFill * viewport;
}

// Every 5%: an IntersectionObserver only reports when a threshold is crossed, and a tall element's "fills 90% of the
// screen" moment can fall between coarse steps.
export const IN_VIEW_THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);
