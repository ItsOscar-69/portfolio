import { isFullyInView, IN_VIEW_THRESHOLDS } from '../lib/in-view.js';

// Muted, looping videos marked data-autoplay get a small Pause/Play pill instead of the browser's player.
// They start only once fully on screen, from the beginning if they had left the screen, and pause when mostly
// out of view. With reduced motion nothing autoplays (the pill still works), and a video the visitor paused
// (the pill counts) stays paused until they press play again.
export function autoplayVideos(doc, { reduced = false } = {}) {
  const win = doc.defaultView;
  const videos = Array.from(doc.querySelectorAll('video[data-autoplay]'));
  if (!videos.length) return null;

  const pausedByUs = new WeakSet();
  const pausedByVisitor = new WeakSet();
  const leftView = new WeakSet();
  for (const video of videos) {
    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'media__toggle';
    const sync = () => {
      const paused = video.paused;
      toggle.textContent = paused ? 'Play' : 'Pause';
      toggle.setAttribute('aria-label', paused ? 'Play the video' : 'Pause the video');
    };
    sync();
    // The frame lets the pill sit over the video's corner, not over the caption.
    const frame = doc.createElement('div');
    frame.className = 'media__frame';
    video.parentNode.insertBefore(frame, video);
    frame.append(video, toggle);

    toggle.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });
    video.addEventListener('pause', () => {
      if (pausedByUs.has(video)) pausedByUs.delete(video);
      else if (!doc.hidden) pausedByVisitor.add(video); // the browser pausing a hidden tab isn't the visitor
      sync();
    });
    video.addEventListener('play', () => {
      pausedByVisitor.delete(video);
      sync();
    });
  }
  if (reduced || !win || !('IntersectionObserver' in win)) return null;

  const observer = new win.IntersectionObserver((entries) => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.intersectionRatio === 0) leftView.add(video);
      if (isFullyInView(entry)) {
        if (!pausedByVisitor.has(video)) {
          if (leftView.has(video)) {
            leftView.delete(video);
            video.currentTime = 0;
          }
          // play() rejects when the browser blocks autoplay; the video then waits for the pill.
          video.play().catch(() => {});
        }
      } else if (entry.intersectionRatio < 0.25 && !video.paused) {
        pausedByUs.add(video);
        video.pause();
      }
    }
  }, { threshold: IN_VIEW_THRESHOLDS });
  videos.forEach((video) => observer.observe(video));
  return observer;
}
