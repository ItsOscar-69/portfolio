import { mirror, cameraProblem, CAMERA_CONSTRAINTS } from '../lib/camera.js';
import { asciiRows } from '../lib/ascii.js';

const TEXT_PX = 12; // the text fallback's character size; JetBrains Mono's characters are 0.6 em wide

// "Try the mirror" (spec §4.3): an opt-in webcam drawn by the ASCII pass.
// - It starts only on a click, and asks for video only.
// - While it runs, "Camera on" and a Stop button show.
// - It stops by itself when its controls ("Camera on" and Stop) leave the screen, the camera ends, the tab is hidden or the
//   page closes.
// - Frames never leave the browser. The <video> is drawn only into the page: by the ascii world, or by the text
//   fallback below when no 3D world is drawing. Nothing is sent, stored or recorded.
export function createMirror({ doc }) {
  const chapter = doc.querySelector('.scene[data-world="ascii"]');
  if (!chapter) return null;
  const win = doc.defaultView;
  const frame = chapter.querySelector('.scene__frame');
  const make = (tag, className, text = '') => {
    const el = doc.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  };

  const controls = make('div', 'mirror');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Mirror');
  const startButton = make('button', 'mirror__start', 'Try the mirror');
  const indicator = make('span', 'mirror__on', 'Camera on');
  const stopButton = make('button', 'mirror__stop', 'Stop');
  const status = make('p', 'mirror__status');
  startButton.type = 'button';
  stopButton.type = 'button';
  stopButton.setAttribute('aria-label', 'Stop the camera');
  status.setAttribute('role', 'status');
  indicator.hidden = true;
  stopButton.hidden = true;
  controls.append(startButton, indicator, stopButton, status);
  chapter.querySelector('.chapter__hook').after(controls);

  const text = make('pre', 'mirror__ascii');
  text.setAttribute('aria-hidden', 'true');
  text.hidden = true;
  const poster = frame.querySelector('.scene__poster');
  const anchor = poster ? poster.closest('picture') || poster : null; // after the <picture>, never inside it
  if (anchor) anchor.after(text);
  else frame.prepend(text);

  const video = doc.createElement('video');
  video.muted = true;
  video.playsInline = true;
  const sample = doc.createElement('canvas');
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });

  let stream = null;
  let wanted = false;
  let raf = 0;

  // With no 3D world drawing the chapter, draw the webcam as text. CSS hides this element while the 3D world is
  // live, and then it is skipped here (offsetParent is null).
  function drawText() {
    raf = win.requestAnimationFrame(drawText);
    if (text.offsetParent === null || video.readyState < 2 || !video.videoWidth) return;
    const cols = Math.max(1, Math.floor(frame.clientWidth / (TEXT_PX * 0.6)));
    const rows = Math.max(1, Math.floor(frame.clientHeight / TEXT_PX));
    if (sample.width !== cols || sample.height !== rows) {
      sample.width = cols;
      sample.height = rows;
    }
    const gridAspect = (cols * 0.6) / rows; // cover-fit the video into the grid
    let sw = video.videoWidth;
    let sh = video.videoHeight;
    if (sw / sh > gridAspect) sw = sh * gridAspect;
    else sh = sw / gridAspect;
    sampleCtx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
    text.textContent = asciiRows(sampleCtx.getImageData(0, 0, cols, rows).data, cols, rows, { mirror: true }).join('\n');
  }

  function show(on) {
    startButton.hidden = on;
    indicator.hidden = !on;
    stopButton.hidden = !on;
    text.hidden = !on;
    chapter.classList.toggle('is-mirroring', on);
    if (!on) text.textContent = '';
  }

  function stop() {
    const stopHadFocus = doc.activeElement === stopButton;
    wanted = false;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    mirror.video = null;
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    status.textContent = '';
    sample.width = 0; // let go of the last low-resolution frame
    sample.height = 0;
    show(false);
    if (stopHadFocus) startButton.focus({ preventScroll: true }); // never leave focus on a hidden button
  }

  async function start() {
    const hadFocus = doc.activeElement === startButton;
    status.textContent = '';
    const devices = win.navigator.mediaDevices;
    if (!devices || typeof devices.getUserMedia !== 'function') {
      status.textContent = cameraProblem(null);
      return;
    }
    wanted = true;
    startButton.disabled = true;
    try {
      const got = await devices.getUserMedia(CAMERA_CONSTRAINTS);
      if (!wanted) { // stopped while the browser was still asking
        got.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = got;
      got.getVideoTracks().forEach((track) => track.addEventListener('ended', () => {
        if (!wanted || stream !== got) return;
        stop();
        status.textContent = 'The camera was turned off.';
      }));
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (!wanted) return; // stopped while the video was starting
      mirror.video = video;
      show(true);
      if (hadFocus) stopButton.focus();
      status.textContent = 'Camera on. The picture stays in your browser: nothing is sent or saved.';
      raf = win.requestAnimationFrame(drawText);
    } catch (err) {
      stop();
      status.textContent = cameraProblem(err);
    } finally {
      startButton.disabled = false;
    }
  }

  startButton.addEventListener('click', start);
  stopButton.addEventListener('click', stop);
  // The camera never stays on behind your back.
  if ('IntersectionObserver' in win) {
    new win.IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry.isIntersecting || !wanted) return;
      stop();
      status.textContent = 'The camera stopped when you scrolled away.';
    }).observe(controls);
  }
  doc.addEventListener('visibilitychange', () => {
    if (!doc.hidden || !wanted) return;
    stop();
    status.textContent = 'The camera stopped when you left the tab.';
  });
  win.addEventListener('pagehide', () => { if (wanted) stop(); });
  return { start, stop, controls };
}
