// Muted, looping videos marked data-autoplay play only while they're on screen.
// With reduced motion nothing autoplays (the controls still work), and a video
// the visitor paused stays paused until they press play again.
export function autoplayVideos(doc, { reduced = false, threshold = 0.35 } = {}) {
  const win = doc.defaultView;
  const videos = Array.from(doc.querySelectorAll('video[data-autoplay]'));
  if (!videos.length || reduced || !win || !('IntersectionObserver' in win)) return null;

  const pausedByUs = new WeakSet();
  const pausedByVisitor = new WeakSet();
  for (const video of videos) {
    video.addEventListener('pause', () => {
      if (pausedByUs.has(video)) pausedByUs.delete(video);
      else pausedByVisitor.add(video);
    });
    video.addEventListener('play', () => pausedByVisitor.delete(video));
  }

  const observer = new win.IntersectionObserver((entries) => {
    for (const { target: video, isIntersecting } of entries) {
      if (isIntersecting) {
        if (!pausedByVisitor.has(video)) {
          // play() rejects when the browser blocks autoplay; the video then waits for its controls.
          video.play().catch(() => {});
        }
      } else if (!video.paused) {
        pausedByUs.add(video);
        video.pause();
      }
    }
  }, { threshold });
  videos.forEach((video) => observer.observe(video));
  return observer;
}
