// ?fps: a small frames-per-second readout with the device tier, for checking real phones against spec §8.1
// (60 fps on a laptop, at least 30 on a mid-range phone). Nothing shows unless the URL asks for it.
export function createFpsMeter(doc) {
  const el = doc.createElement('div');
  el.className = 'fps';
  el.setAttribute('aria-hidden', 'true');
  doc.body.append(el);
  let frames = 0;
  let since = 0;
  let tier = '';
  return {
    setTier(name) { tier = name; },
    tick(now) {
      if (!since) since = now;
      frames++;
      if (now - since >= 1000) {
        el.textContent = `${Math.round((frames * 1000) / (now - since))} fps${tier ? ` · ${tier}` : ''}`;
        frames = 0;
        since = now;
      }
    },
  };
}
